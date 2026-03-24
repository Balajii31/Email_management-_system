"""
=============================================================
 PHASE 6 — Results Visualizer
 Reads training_history.json + generates HTML report
=============================================================
"""

import json
import webbrowser
from pathlib import Path

MODELS_DIR = Path(r"C:/Users/Balaji G/Downloads/email-management-system/ml_pipeline/saved_models")
REPORT_PATH = MODELS_DIR / "training_report.html"


def generate_report():
    hist_file = MODELS_DIR / "training_history.json"
    if not hist_file.exists():
        print("No training_history.json found. Train the model first.")
        return

    with open(hist_file) as f:
        history = json.load(f)

    epochs        = [h["epoch"]      for h in history]
    train_losses  = [h["train_loss"] for h in history]
    val_losses    = [h["loss"]       for h in history]
    spam_f1s      = [h["spam_f1"]    for h in history]
    cat_f1s       = [h["cat_f1"]     for h in history]
    pri_f1s       = [h["pri_f1"]     for h in history]
    composites    = [h["composite"]  for h in history]

    best_epoch = history[[h["composite"] for h in history].index(max(composites))]

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BERT Email Classifier — Training Report</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Inter', sans-serif; background: #0f1117; color: #e2e8f0; min-height: 100vh; }}
  .hero {{ background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%);
           padding: 48px 40px; text-align: center; border-bottom: 1px solid #2d3748; }}
  .hero h1 {{ font-size: 2.2rem; font-weight: 700;
              background: linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4);
              -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
  .hero p  {{ margin-top: 10px; color: #94a3b8; font-size: 1rem; }}
  .grid    {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
              gap: 20px; padding: 32px 40px; }}
  .card    {{ background: #1e2433; border-radius: 16px; padding: 28px;
              border: 1px solid #2d3748; text-align: center; }}
  .card .value {{ font-size: 2.2rem; font-weight: 700; color: #7c3aed; }}
  .card .label {{ font-size: 0.85rem; color: #64748b; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }}
  .charts  {{ display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 0 40px 40px; }}
  .chart-card {{ background: #1e2433; border-radius: 16px; padding: 28px;
                 border: 1px solid #2d3748; }}
  .chart-card h3 {{ font-size: 1rem; font-weight: 600; margin-bottom: 18px; color: #94a3b8; }}
  canvas {{ max-height: 260px; }}
  @media (max-width: 768px) {{ .charts {{ grid-template-columns: 1fr; }} }}
</style>
</head>
<body>
<div class="hero">
  <h1>🤖 BERT Email Classifier</h1>
  <p>Multi-task DistilBERT — Spam Detection · Category Classification · Priority Scoring</p>
</div>

<div class="grid">
  <div class="card">
    <div class="value">{best_epoch['spam_f1']:.3f}</div>
    <div class="label">Best Spam F1</div>
  </div>
  <div class="card">
    <div class="value">{best_epoch['spam_acc']:.3f}</div>
    <div class="label">Spam Accuracy</div>
  </div>
  <div class="card">
    <div class="value">{best_epoch['cat_f1']:.3f}</div>
    <div class="label">Category F1</div>
  </div>
  <div class="card">
    <div class="value">{best_epoch['pri_f1']:.3f}</div>
    <div class="label">Priority F1</div>
  </div>
  <div class="card">
    <div class="value">{best_epoch['composite']:.3f}</div>
    <div class="label">Composite Score</div>
  </div>
  <div class="card">
    <div class="value">{best_epoch['epoch']}</div>
    <div class="label">Best Epoch</div>
  </div>
</div>

<div class="charts">
  <div class="chart-card">
    <h3>Training vs Validation Loss</h3>
    <canvas id="lossChart"></canvas>
  </div>
  <div class="chart-card">
    <h3>F1 Scores per Epoch</h3>
    <canvas id="f1Chart"></canvas>
  </div>
</div>

<script>
const epochs = {json.dumps(epochs)};
const trainLoss = {json.dumps(train_losses)};
const valLoss   = {json.dumps(val_losses)};
const spamF1    = {json.dumps(spam_f1s)};
const catF1     = {json.dumps(cat_f1s)};
const priF1     = {json.dumps(pri_f1s)};
const composite = {json.dumps(composites)};

const commonOpts = {{
  responsive: true,
  plugins: {{ legend: {{ labels: {{ color: '#94a3b8' }} }} }},
  scales: {{
    x: {{ ticks: {{ color: '#64748b' }}, grid: {{ color: '#2d3748' }} }},
    y: {{ ticks: {{ color: '#64748b' }}, grid: {{ color: '#2d3748' }} }}
  }}
}};

new Chart(document.getElementById('lossChart'), {{
  type: 'line',
  data: {{
    labels: epochs,
    datasets: [
      {{ label: 'Train Loss', data: trainLoss, borderColor: '#7c3aed', tension: 0.4, fill: false }},
      {{ label: 'Val Loss',   data: valLoss,   borderColor: '#06b6d4', tension: 0.4, fill: false }}
    ]
  }},
  options: commonOpts
}});

new Chart(document.getElementById('f1Chart'), {{
  type: 'line',
  data: {{
    labels: epochs,
    datasets: [
      {{ label: 'Spam F1',   data: spamF1,    borderColor: '#ef4444', tension: 0.4, fill: false }},
      {{ label: 'Category F1', data: catF1,   borderColor: '#f59e0b', tension: 0.4, fill: false }},
      {{ label: 'Priority F1', data: priF1,   borderColor: '#10b981', tension: 0.4, fill: false }},
      {{ label: 'Composite',  data: composite, borderColor: '#a78bfa', tension: 0.4, borderDash: [5,5], fill: false }}
    ]
  }},
  options: commonOpts
}});
</script>
</body>
</html>"""

    REPORT_PATH.write_text(html, encoding="utf-8")
    print(f"Report saved → {REPORT_PATH}")
    webbrowser.open(str(REPORT_PATH))


if __name__ == "__main__":
    generate_report()
