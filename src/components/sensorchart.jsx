import React, { useEffect, useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { gql } from '@apollo/client';

// Query to get historical data
const LIST_SENSORS_DATA = gql`
  query ListSensorsData($limit: Int) {
    listSensorsData(limit: $limit) {
      items {
        device_id
        timestamp
        temperature
        humidity
        battery_voltage
        move_count
        field_2
        received_at
      }
    }
  }
`;

// Subscription for real-time updates
const ON_CREATE_SENSORS_DATA = gql`
  subscription OnCreateSensorsData {
    onCreateSensorsData {
      device_id
      timestamp
      temperature
      humidity
      battery_voltage
      move_count
      field_2
      received_at
    }
  }
`;

export default function SensorChart() {
  const [sensorData, setSensorData] = useState([]);
  
  // Query for initial/historical data - last 100 readings
  const { loading: queryLoading, error: queryError, data: queryData } = useQuery(LIST_SENSORS_DATA, {
    variables: { limit: 100 },
    fetchPolicy: 'network-only'
  });
  
  // Subscription for real-time updates
  const { data: subData, error: subError } = useSubscription(ON_CREATE_SENSORS_DATA);

  // Handle initial data load
  useEffect(() => {
    if (queryData?.listSensorsData?.items) {
      const formattedData = queryData.listSensorsData.items
        .map(item => ({
          ...item,
          formattedTime: new Date(item.received_at).toLocaleTimeString()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      setSensorData(formattedData);
    }
  }, [queryData]);

  // Handle real-time updates
  useEffect(() => {
    if (subData?.onCreateSensorsData) {
      const newData = subData.onCreateSensorsData;
      console.log('New sensor data received:', newData);
      
      setSensorData(prevData => {
        const updatedData = [...prevData, {
          ...newData,
          formattedTime: new Date(newData.received_at).toLocaleTimeString()
        }].slice(-100); // Keep last 100 data points
        return updatedData;
      });
    }
  }, [subData]);

  if (queryError || subError) {
    console.error('Query error:', queryError);
    console.error('Subscription error:', subError);
    return <div className="error-message">Error loading sensor data</div>;
  }

  if (queryLoading && sensorData.length === 0) {
    return <div className="loading">Loading sensor data...</div>;
  }

  return (
    <div className="sensor-chart-container">
      <h2>Sensor Data Visualization</h2>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={sensorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="formattedTime" 
            label={{ value: 'Time', position: 'bottom' }}
          />
          <YAxis 
            yAxisId="temp"
            domain={['auto', 'auto']}
            label={{ value: 'Temperature (°C)', angle: -90, position: 'left' }}
          />
          <YAxis 
            yAxisId="humid"
            orientation="right"
            domain={[0, 100]}
            label={{ value: 'Humidity (%)', angle: 90, position: 'right' }}
          />
          <YAxis 
            yAxisId="battery"
            orientation="right"
            domain={['auto', 'auto']}
            label={{ value: 'Battery (V)', angle: 90, position: 'right' }}
          />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="temp"
            type="monotone" 
            dataKey="temperature" 
            stroke="#8884d8" 
            name="Temperature"
          />
          <Line 
            yAxisId="humid"
            type="monotone" 
            dataKey="humidity" 
            stroke="#82ca9d" 
            name="Humidity"
          />
          <Line 
            yAxisId="battery"
            type="monotone" 
            dataKey="battery_voltage" 
            stroke="#ffc658" 
            name="Battery Voltage"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Latest Values Display */}
      {sensorData.length > 0 && (
        <div className="latest-values">
          <h3>Latest Readings</h3>
          <div className="readings-grid">
            <div className="reading-item">
              <label>Device ID:</label>
              <span>{sensorData[sensorData.length - 1].device_id}</span>
            </div>
            <div className="reading-item">
              <label>Temperature:</label>
              <span>{sensorData[sensorData.length - 1].temperature}°C</span>
            </div>
            <div className="reading-item">
              <label>Humidity:</label>
              <span>{sensorData[sensorData.length - 1].humidity}%</span>
            </div>
            <div className="reading-item">
              <label>Battery:</label>
              <span>{sensorData[sensorData.length - 1].battery_voltage}V</span>
            </div>
            <div className="reading-item">
              <label>Move Count:</label>
              <span>{sensorData[sensorData.length - 1].move_count}</span>
            </div>
            <div className="reading-item">
              <label>Last Updated:</label>
              <span>{new Date(sensorData[sensorData.length - 1].received_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
