import React, { useEffect, useState } from 'react';
import { useSubscription } from '@apollo/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { gql } from '@apollo/client';

const SUBSCRIBE_SENSOR_DATA = gql`
  subscription {
    onNewSensorData {
      timestamp
      temperature
      humidity
    }
  }
`;

export default function SensorChart() {
  const { data, loading } = useSubscription(SUBSCRIBE_SENSOR_DATA);
  const [sensorData, setSensorData] = useState([]);

  useEffect(() => {
    if (data?.onNewSensorData) {
      setSensorData(prev => [...prev.slice(-20), data.onNewSensorData]);
    }
  }, [data]);

  const latest = sensorData[sensorData.length - 1];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Live Temperature</h2>

      <LineChart width={600} height={300} data={sensorData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" tickFormatter={ts => new Date(ts * 1000).toLocaleTimeString()} />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="temperature" stroke="#f87171" />
      </LineChart>

      {/* ALERT BLOCK */}
      {latest && latest.temperature > 30 && (
        <div className="bg-red-100 text-red-800 p-3 mt-4 rounded shadow">
          ⚠️ High temperature alert: <strong>{latest.temperature}°C</strong>
        </div>
      )}
    </div>
  );
}
