import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function UptimeChart({ data = [] }) {
  if (!data.length) {
    return <div className="text-gray-400">No uptime data available</div>;
  }

  return (
    <Line
      data={{
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: "Uptime %",
            data: data.map((d) => d.uptime),
            fill: true,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.3)",
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#3b82f6",
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 90,
            max: 100,
            ticks: { callback: (val) => `${val}%` },
          },
        },
      }}
    />
  );
}
