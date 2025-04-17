// src/App.js
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

const data = {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [
    {
      label: 'Sales',
      data: [33, 53, 85],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.4,
    },
  ],
};

function App() {
  return (
    <div style={{ width: '600px', margin: '50px auto' }}>
      <h2>CloudApp Dashboard</h2>
      <Line data={data} />
    </div>
  );
}

export default App;
