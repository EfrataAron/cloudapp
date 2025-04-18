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
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { gql } from '@apollo/client';

// Query to list sensor data
const LIST_SENSORS_DATA = gql`
  query ListSensorsData($limit: Int, $filter: TableSensorsDataFilterInput) {
    listSensorsData(
      limit: $limit,
      filter: $filter
    ) {
      items {
        device_id: device_id
        timestamp: timestamp
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
      device_id: device_id
      timestamp: timestamp
      temperature
      humidity
      battery_voltage
      move_count
      field_2
      received_at
    }
  }
`;

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState(new Set());

  // Query for historical data
  const { loading, error, data } = useQuery(LIST_SENSORS_DATA, {
    variables: {
      limit: 100,
      filter: selectedDevice ? {
        device_id: { eq: selectedDevice }
      } : undefined
    },
    pollInterval: 30000, // Poll every 30 seconds for new data
  });

  // Subscribe to new data
  const { data: subData } = useSubscription(ON_CREATE_SENSORS_DATA);

  // Process initial data
  useEffect(() => {
    if (data?.listSensorsData?.items) {
      const items = data.listSensorsData.items;
      
      // Update devices list
      const deviceSet = new Set(items.map(item => item.device_id));
      setDevices(deviceSet);

      // Process and sort data
      const processedData = processData(items);

      setSensorData(processedData);
    }
  }, [data]);

  // Handle real-time updates
  useEffect(() => {
    if (subData?.onCreateSensorsData) {
      const newData = subData.onCreateSensorsData;
      
      // Add new device to list if it's new
      setDevices(prev => new Set([...prev, newData.device_id]));

      // Only add data if it matches the selected device or no device is selected
      if (!selectedDevice || newData.device_id === selectedDevice) {
        setSensorData(prevData => {
          const updatedData = [...prevData, {
            ...newData,
            formattedTime: new Date(newData.received_at).toLocaleString()
          }].slice(-100); // Keep last 100 points
          return updatedData;
        });
      }
    }
  }, [subData, selectedDevice]);

  // Update the process data function to handle null values
  const processData = (items) => {
    return items
      .map(item => ({
        ...item,
        // Provide default values for null fields
        device_id: item.device_id || 'unknown',
        timestamp: item.timestamp || Date.now(),
        temperature: item.temperature || 0,
        humidity: item.humidity || 0,
        battery_voltage: item.battery_voltage || 0,
        move_count: item.move_count || 0,
        field_2: item.field_2 || 0,
        id: `${item.device_id || 'unknown'}-${item.timestamp || Date.now()}`,
        formattedTime: new Date(item.received_at).toLocaleString(),
        timestampMs: new Date(item.received_at).getTime()
      }))
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 50);
  };

  // Update the device filtering logic
  const filteredData = selectedDevice 
    ? sensorData.filter(item => item.device_id && item.device_id === selectedDevice)
    : sensorData;

  if (error) {
    return <div className="error-message">Error loading sensor data: {error.message}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Sensor Data Dashboard</h1>
        <div className="device-selector">
          <select 
            value={selectedDevice || ''} 
            onChange={(e) => setSelectedDevice(e.target.value || null)}
          >
            <option value="">All Devices</option>
            {[...devices].map(device => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && sensorData.length === 0 ? (
        <div className="loading">Loading sensor data...</div>
      ) : (
        <div className="charts-grid">
          {/* Temperature and Humidity Chart */}
          <div className="chart-container">
            <h2>Temperature and Humidity Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="temp" domain={['auto', 'auto']} label={{ value: '°C', position: 'insideLeft' }} />
                <YAxis yAxisId="humid" orientation="right" domain={[0, 100]} label={{ value: '%', position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Area 
                  yAxisId="temp" 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ff7300" 
                  fill="#ff7300" 
                  fillOpacity={0.3} 
                  name="Temperature (°C)" 
                  isAnimationActive={false}
                />
                <Area 
                  yAxisId="humid" 
                  type="monotone" 
                  dataKey="humidity" 
                  stroke="#82ca9d" 
                  fill="#82ca9d" 
                  fillOpacity={0.3} 
                  name="Humidity (%)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Real-time Values Panel */}
          {filteredData.length > 0 && (
            <div className="latest-readings">
              <h2>Real-time Readings</h2>
              <div className="reading-card">
                <div className="reading-header">
                  <h3>Device: {filteredData[0].device_id || 'Unknown'}</h3>
                  <span className="timestamp">{filteredData[0].formattedTime}</span>
                </div>
                <div className="readings-data">
                  <div className="reading-item">
                    <label>Temperature</label>
                    <span>{(filteredData[0].temperature || 0).toFixed(1)}°C</span>
                  </div>
                  <div className="reading-item">
                    <label>Humidity</label>
                    <span>{(filteredData[0].humidity || 0).toFixed(1)}%</span>
                  </div>
                  <div className="reading-item">
                    <label>Battery</label>
                    <span>{(filteredData[0].battery_voltage || 0).toFixed(2)}V</span>
                  </div>
                  <div className="reading-item">
                    <label>Move Count</label>
                    <span>{filteredData[0].move_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add debug information panel */}
          <div className="debug-panel">
            <h3>Debug Information</h3>
            <pre>
              {JSON.stringify(filteredData[0], null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 