class GenerationStats {
    constructor() {
        const saved = localStorage.getItem("genStats");
        this.history = saved ? JSON.parse(saved) : [];
        this.generation = this.history.length;
        this.sessionBest = 0;
        this._recorded = false;
    }

    trackDistance(distance) {
        if (distance > this.sessionBest) {
            this.sessionBest = distance;
        }
    }

    recordGeneration() {
        if (this._recorded) return;
        this._recorded = true;
        this.generation++;
        this.history.push({
            gen: this.generation,
            distance: Math.round(this.sessionBest)
        });
        if (this.history.length > 30) this.history.shift();
        localStorage.setItem("genStats", JSON.stringify(this.history));
    }

    clearHistory() {
        this.history = [];
        this.generation = 0;
        this.sessionBest = 0;
        this._recorded = false;
        localStorage.removeItem("genStats");
    }

    draw(ctx) {
        const canvas = ctx.canvas;
        const chartH = 110;
        const chartW = canvas.width;
        const top = canvas.height - chartH;
        const padding = 10;

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, top, chartW, chartH);

        ctx.fillStyle = "#aaa";
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        ctx.fillText("Distance per Generation", padding, top + 14);

        const maxDist = this.history.length > 0
            ? Math.max(...this.history.map(h => h.distance), 1)
            : 1;

        ctx.fillStyle = "#00e676";
        ctx.font = "11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`Best: ${maxDist}px`, chartW - padding, top + 14);

        if (this.history.length === 0) {
            ctx.fillStyle = "#555";
            ctx.font = "11px monospace";
            ctx.textAlign = "center";
            ctx.fillText("No generations recorded yet", chartW / 2, top + chartH / 2 + 10);
            return;
        }

        const barAreaTop = top + 22;
        const barAreaH = chartH - 34;
        const maxBars = 30;
        const visible = this.history.slice(-maxBars);
        const barW = Math.max(4, Math.floor((chartW - padding * 2) / visible.length) - 2);

        visible.forEach((entry, i) => {
            const barH = Math.max(1, (entry.distance / maxDist) * barAreaH);
            const x = padding + i * (barW + 2);
            const y = barAreaTop + barAreaH - barH;
            const isLast = i === visible.length - 1;

            if (isLast) {
                ctx.fillStyle = "#00e676";
            } else {
                const alpha = 0.35 + 0.45 * (i / visible.length);
                ctx.fillStyle = `rgba(80, 160, 80, ${alpha})`;
            }
            ctx.fillRect(x, y, barW, barH);

            if (isLast || visible.length <= 10) {
                ctx.fillStyle = isLast ? "#fff" : "#888";
                ctx.font = "9px monospace";
                ctx.textAlign = "center";
                ctx.fillText(entry.gen, x + barW / 2, barAreaTop + barAreaH + 11);
            }
        });
    }
}
