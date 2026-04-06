import re

app_css_path = 'public/app.css'
with open(app_css_path, 'r') as f:
    app_css = f.read()

# Replace variables in app.css
root_vars = """:root {
  --ser-bg: #F4F5F7;
  --ser-surface: #FFFFFF;
  --ser-surface-strong: #EAECEF;
  --ser-ink: #1B1C1D;
  --ser-muted: #5B6168;
  --ser-line: rgba(27, 28, 29, 0.12);
  --ser-accent: #E81C24;
  --ser-accent-soft: rgba(232, 28, 36, 0.08);
  --ser-alert: #F04438;
  --ser-danger: #E81C24;
  --ser-danger-soft: rgba(232, 28, 36, 0.12);
  --ser-info-soft: rgba(27, 28, 29, 0.08);
  --ser-shadow: 0 4px 12px rgba(27, 28, 29, 0.08);
  --ser-radius: 8px;
}"""
app_css = re.sub(r':root\s*\{.*?\n\}', root_vars, app_css, flags=re.DOTALL)

# Replace gradients in body
body_css = """body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--ser-ink);
  background: var(--ser-bg);
}"""
app_css = re.sub(r'body\s*\{.*?\n\}', body_css, app_css, flags=re.DOTALL)

# Replace other gradients and specific colors
app_css = re.sub(r'rgba\(255,\s*255,\s*255,\s*0\.\d+\)', 'var(--ser-surface)', app_css)
app_css = re.sub(r'rgba\(243,\s*229,\s*201,\s*0\.\d+\)', 'var(--ser-surface-strong)', app_css)
app_css = re.sub(r'rgba\(255,\s*250,\s*242,\s*0\.\d+\)', 'var(--ser-surface)', app_css)
app_css = re.sub(r'rgba\(255,\s*247,\s*237,\s*0\.\d+\)', 'var(--ser-surface)', app_css)
app_css = re.sub(r'linear-gradient\(180deg,\s*var\(--ser-surface\),\s*var\(--ser-surface-strong\)\)', 'var(--ser-surface)', app_css)

app_css = re.sub(r'border-radius:\s*999px;', 'border-radius: var(--ser-radius);', app_css)
app_css = re.sub(r'border-radius:\s*1[0-9]px;', 'border-radius: var(--ser-radius);', app_css)
app_css = re.sub(r'border-radius:\s*2[0-9]px;', 'border-radius: var(--ser-radius);', app_css)
app_css = re.sub(r'background:\s*linear-gradient\(.*?\);', 'background: var(--ser-surface);', app_css)

# Font families
app_css = re.sub(r'font-family:\s*Georgia[^\n]*;', '', app_css)
app_css = re.sub(r'color:\s*#0f766e;', 'color: var(--ser-ink);', app_css)

# Primary Button
btn_css = """.ser-button-primary {
  color: #FFFFFF;
  background: var(--ser-ink);
  box-shadow: 0 4px 6px rgba(27, 28, 29, 0.1);
}"""
app_css = re.sub(r'\.ser-button-primary\s*\{.*?\n\}', btn_css, app_css, flags=re.DOTALL)

with open(app_css_path, 'w') as f:
    f.write(app_css)


storefront_css_path = 'src/storefront/custom-storefront.css'
with open(storefront_css_path, 'r') as f:
    sf_css = f.read()

sf_css = re.sub(r'font-family: Avenir Next.*?;', 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;', sf_css)
sf_css = re.sub(r'font-family:\s*Georgia[^\n]*;', '', sf_css)
sf_css = re.sub(r'color:\s*#[0-9a-fA-F]+;', 'color: #1B1C1D;', sf_css)
# Keep price accent but use Fire Red
sf_css = re.sub(r'\.grid-product__price,\n.*?\{.*?color:\s*#1B1C1D;', '.grid-product__price,\n.ser-preview-shell .ecwid-productBrowser .product-details__price {\n  color: #E81C24;', sf_css, flags=re.DOTALL)
sf_css = re.sub(r'border-radius:\s*18px;', 'border-radius: 8px;', sf_css)
sf_css = re.sub(r'border-radius:\s*999px;', 'border-radius: 8px;', sf_css)
sf_css = re.sub(r'background:\s*linear-gradient.*?;', 'background: #1B1C1D;', sf_css)

with open(storefront_css_path, 'w') as f:
    f.write(sf_css)
