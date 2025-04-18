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
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { gql } from '@apollo/client';

// Query to list sensor data
const LIST_SENSORS_DATA = gql`
  query ListSensorsData($limit: Int, $filter: TableSensorsDataFilterInput) {
    listSensorsData(limit: $limit, filter: $filter) {
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
      nextToken
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

// Alert thresholds
const ALERT_THRESHOLDS = {
  temperature: { min: 10, max: 35, critical: 40 },
  humidity: { min: 30, max: 70, critical: 80 },
  battery_voltage: { min: 2.5, critical: 2.0 },
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SensorDashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState(new Set());
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({});

  // Query for historical data
  const { loading, error, data } = useQuery(LIST_SENSORS_DATA, {
    variables: {
      limit: 100,
      filter: selectedDevice ? {
        device_id: { eq: selectedDevice }
      } : undefined
    },
    pollInterval: 5000, // Poll every 5 seconds
  });

  // Subscribe to new data
  const { data: subData } = useSubscription(ON_CREATE_SENSORS_DATA);

  // Check for alerts and update stats
  const processNewReading = (reading) => {
    // Check temperature alerts
    if (reading.temperature > ALERT_THRESHOLDS.temperature.critical) {
      addAlert('CRITICAL', `High temperature alert: ${reading.temperature}°C`, reading.device_id);
    } else if (reading.temperature > ALERT_THRESHOLDS.temperature.max) {
      addAlert('WARNING', `Temperature warning: ${reading.temperature}°C`, reading.device_id);
    }

    // Check humidity alerts
    if (reading.humidity > ALERT_THRESHOLDS.humidity.critical) {
      addAlert('CRITICAL', `High humidity alert: ${reading.humidity}%`, reading.device_id);
    } else if (reading.humidity > ALERT_THRESHOLDS.humidity.max) {
      addAlert('WARNING', `Humidity warning: ${reading.humidity}%`, reading.device_id);
    }

    // Check battery alerts
    if (reading.battery_voltage < ALERT_THRESHOLDS.battery_voltage.critical) {
      addAlert('CRITICAL', `Critical battery level: ${reading.battery_voltage}V`, reading.device_id);
    } else if (reading.battery_voltage < ALERT_THRESHOLDS.battery_voltage.min) {
      addAlert('WARNING', `Low battery warning: ${reading.battery_voltage}V`, reading.device_id);
    }

    // Update statistics
    updateStats(reading);
  };

  // Add new alert
  const addAlert = (severity, message, deviceId) => {
    const newAlert = {
      id: Date.now(),
      severity,
      message,
      deviceId,
      timestamp: new Date().toLocaleString()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep last 10 alerts
  };

  // Update statistics
  const updateStats = (reading) => {
    setStats(prev => {
      const deviceStats = prev[reading.device_id] || {
        totalReadings: 0,
        avgTemperature: 0,
        avgHumidity: 0,
        totalMoves: 0,
      };

      const newTotalReadings = deviceStats.totalReadings + 1;
      
      return {
        ...prev,
        [reading.device_id]: {
          totalReadings: newTotalReadings,
          avgTemperature: (deviceStats.avgTemperature * deviceStats.totalReadings + reading.temperature) / newTotalReadings,
          avgHumidity: (deviceStats.avgHumidity * deviceStats.totalReadings + reading.humidity) / newTotalReadings,
          totalMoves: deviceStats.totalMoves + reading.move_count,
          lastReading: reading,
        }
      };
    });
  };

  // Process initial data
  useEffect(() => {
    if (data?.listSensorsData?.items) {
      const items = data.listSensorsData.items;
      
      // Update devices list
      const deviceSet = new Set(items.map(item => item.device_id));
      setDevices(deviceSet);

      // Process and sort data
      const processedData = items
        .map(item => ({
          ...item,
          formattedTime: new Date(item.received_at).toLocaleString()
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      setSensorData(processedData);
      
      // Process each reading for alerts and stats
      items.forEach(processNewReading);
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
        const processedNewData = {
          ...newData,
          formattedTime: new Date(newData.received_at).toLocaleString()
        };

        setSensorData(prevData => {
          const updatedData = [...prevData, processedNewData].slice(-100);
          return updatedData;
        });

        // Process new reading for alerts and stats
        processNewReading(newData);
      }
    }
  }, [subData, selectedDevice]);

  if (error) {
    return <div className="error-message">Error loading sensor data: {error.message}</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Real-time Sensor Dashboard</h1>
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

      {/* Alerts Panel */}
      <div className="alerts-panel">
        <h2>Active Alerts</h2>
        <div className="alerts-container">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.severity.toLowerCase()}`}>
              <span className="alert-time">{alert.timestamp}</span>
              <span className="alert-severity">{alert.severity}</span>
              <span className="alert-message">{alert.message}</span>
              <span className="alert-device">Device: {alert.deviceId}</span>
            </div>
          ))}
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
              <AreaChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="temp" domain={['auto', 'auto']} />
                <YAxis yAxisId="humid" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ff7300" fill="#ff7300" fillOpacity={0.3} name="Temperature (°C)" />
                <Area yAxisId="humid" type="monotone" dataKey="humidity" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} name="Humidity (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Battery Voltage Chart */}
          <div className="chart-container">
            <h2>Battery Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="battery_voltage" stroke="#8884d8" name="Battery (V)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Movement Activity Chart */}
          <div className="chart-container">
            <h2>Movement Activity</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sensorData.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedTime" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="move_count" fill="#ffc658" name="Movement Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device Statistics */}
          <div className="chart-container">
            <h2>Device Statistics</h2>
            <div className="stats-grid">
              {Object.entries(stats).map(([deviceId, stat]) => (
                <div key={deviceId} className="stat-card">
                  <h3>{deviceId}</h3>
                  <div className="stat-content">
                    <div className="stat-item">
                      <label>Avg Temperature</label>
                      <span>{stat.avgTemperature.toFixed(1)}°C</span>
                    </div>
                    <div className="stat-item">
                      <label>Avg Humidity</label>
                      <span>{stat.avgHumidity.toFixed(1)}%</span>
                    </div>
                    <div className="stat-item">
                      <label>Total Movements</label>
                      <span>{stat.totalMoves}</span>
                    </div>
                    <div className="stat-item">
                      <label>Total Readings</label>
                      <span>{stat.totalReadings}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 