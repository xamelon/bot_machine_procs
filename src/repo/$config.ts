// Connecting GitHub by signing in: the Client ID of a GitHub OAuth App with
// Device Flow enabled. It is public, not a secret — no client secret is used.
// Empty means the page offers only the manual deploy-key steps. The two URLs
// exist so tests can stand a fake GitHub in for the real one.
//
// `root` is the Git checkout, when the app does not run from it: in Docker the
// app runs from /app and the checkout is mounted at its own path (REPO_ROOT).
export default {
    root: { type: "string", default: "", env: "REPO_ROOT" },
    githubClientId: { type: "string", default: "", env: "GITHUB_CLIENT_ID" },
    githubUrl: { type: "string", default: "https://github.com", env: "REPO_GITHUB_URL" },
    githubApi: { type: "string", default: "https://api.github.com", env: "REPO_GITHUB_API" },
} as const satisfies ConfigSchema;
