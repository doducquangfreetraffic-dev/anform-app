import { Octokit } from '@octokit/rest';
import { withRetry } from '@/lib/utils/retry';

const REPO = 'anform-form-deployments';

let _octokit: Octokit | null = null;
function octokit() {
  if (_octokit) return _octokit;
  _octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return _octokit;
}

export async function pushFormHtml(opts: {
  slug: string;
  html: string;
}): Promise<{ commitSha: string; htmlUrl: string }> {
  const owner = process.env.GITHUB_OWNER!;
  const path = `${opts.slug}/index.html`;
  const message = `Deploy form ${opts.slug}`;

  return withRetry(async () => {
    const gh = octokit();

    // Check if file exists to obtain its SHA (required for update)
    let existingSha: string | undefined;
    try {
      const existing = await gh.repos.getContent({ owner, repo: REPO, path });
      if (!Array.isArray(existing.data) && existing.data.type === 'file') {
        existingSha = existing.data.sha;
      }
    } catch (err) {
      const e = err as { status?: number };
      if (e.status !== 404) throw err;
    }

    const res = await gh.repos.createOrUpdateFileContents({
      owner,
      repo: REPO,
      path,
      message,
      content: Buffer.from(opts.html, 'utf-8').toString('base64'),
      sha: existingSha,
    });

    return {
      commitSha: res.data.commit.sha ?? '',
      htmlUrl: res.data.content?.html_url ?? '',
    };
  }, `pushFormHtml(${opts.slug})`);
}

// Ensure the deployment repo has a vercel.json that rewrites <slug>/ → <slug>/index.html
// (idempotent — safe to call every deploy)
export async function ensureVercelConfig(): Promise<void> {
  const owner = process.env.GITHUB_OWNER!;
  const path = 'vercel.json';
  const config = {
    cleanUrls: true,
    trailingSlash: true,
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        ],
      },
    ],
  };
  const content = JSON.stringify(config, null, 2);
  return withRetry(async () => {
    const gh = octokit();
    let existingSha: string | undefined;
    let existingContent: string | undefined;
    try {
      const existing = await gh.repos.getContent({ owner, repo: REPO, path });
      if (!Array.isArray(existing.data) && existing.data.type === 'file') {
        existingSha = existing.data.sha;
        existingContent = Buffer.from(existing.data.content, 'base64').toString('utf-8');
      }
    } catch (err) {
      const e = err as { status?: number };
      if (e.status !== 404) throw err;
    }
    if (existingContent === content) return;
    await gh.repos.createOrUpdateFileContents({
      owner,
      repo: REPO,
      path,
      message: 'chore: vercel.json',
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha: existingSha,
    });
  }, 'ensureVercelConfig');
}
