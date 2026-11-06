# CI Deployment Prerequisites

The dashboard deployment workflow sends API requests through a Cloudflare-proxied endpoint.

## Required Cloudflare Setting

**Bot Fight Mode must be disabled** or automated GitHub Actions runner IPs will trigger a Cloudflare Managed Challenge (`HTTP 403`).

### Finding the Setting

The toggle is nested inside a subcategory and will not appear if you search for "Bot Fight Mode" directly:

1. In the Cloudflare dashboard, select the domain.
2. In the left navigation, go to **Security** → **Settings**.
3. Scroll down to the **Bot traffic settings** section.
4. Set **Bot Fight Mode** to **Off**.