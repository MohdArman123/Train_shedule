const express = require('express');
const axios = require('axios');

const app = express();
const port = 3000;

const JOHN_DOE_API_BASE_URL = 'http://20.244.56.144/train';

let companyCredentials = {};

// Register the company with John Doe Railway Server
async function registerCompany() {
  try {
    const registrationData = {
      companyName: 'Train Central',
      ownerName: 'Ram',
      rollNo: '1', // Replace this with your university/college roll number
      ownerEmail: 'ram@abc.edu',
      accessCode: 'FKDLjg', // Replace this with the correct access code
    };

    const response = await axios.post(`${JOHN_DOE_API_BASE_URL}/register`, registrationData);
    companyCredentials = {
      clientID: response.data.clientID,
      clientSecret: response.data.clientSecret,
    };
    console.log('Company registered successfully:', companyCredentials);
  } catch (error) {
    if (error.response && error.response.status === 409) {
      console.warn('Company is already registered. Using existing credentials.');
    } else {
      console.error('Failed to register the company:', error.message);
    }
  }
}
// Get the authorization token for the registered company
async function getAuthToken() {
  try {
    if (!companyCredentials) {
      console.log('Company credentials not found. Register the company first.');
      return null;
    }

    const authData = {
      companyName: 'Train Central',
      clientID: companyCredentials.clientID,
      ownerName: 'Ram',
      ownerEmail: 'ram@abc.edu',
      rollNo: '1', // Replace this with your university/college roll number
      clientSecret: companyCredentials.clientSecret,
    };

    const response = await axios.post(`${JOHN_DOE_API_BASE_URL}/auth`, authData);
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get the authorization token:', error.message);
    return null;
  }
}

// Fetch all train details from the John Doe Railway Server
async function fetchAllTrains(authToken) {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${JOHN_DOE_API_BASE_URL}/trains`, { headers });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch train details:', error.message);
    return [];
  }
}

// API endpoint to get train schedules with seat availability and pricing
app.get('/api/trains', async (req, res) => {
  try {
    if (!companyCredentials) {
      // Register the company and get credentials if not registered yet
      await registerCompany();
    }

    const authToken = await getAuthToken();
    if (!authToken) {
      return res.status(500).json({ error: 'Failed to obtain the authorization token.' });
    }

    const allTrains = await fetchAllTrains(authToken);

    // Filter trains departing in the next 12 hours and ignore trains departing in the next 30 minutes
    const currentTimestamp = Date.now();
    const twelveHoursInMilliseconds = 12 * 60 * 60 * 1000;
    const filteredTrains = allTrains.filter(
      (train) => train.departureTime - currentTimestamp >= 30 * 60 * 1000 && train.departureTime <= currentTimestamp + twelveHoursInMilliseconds
    );

    // Sort the filtered trains based on price, seats, and departure time (including delays)
    filteredTrains.sort((a, b) => {
      const aPrice = a.price.AC + a.price.sleeper;
      const bPrice = b.price.AC + b.price.sleeper;

      const aSeats = a.seatsAvailable.AC + a.seatsAvailable.sleeper;
      const bSeats = b.seatsAvailable.AC + b.seatsAvailable.sleeper;

      const aDepartureTime = a.departureTime + a.delayedBy * 60 * 1000;
      const bDepartureTime = b.departureTime + b.delayedBy * 60 * 1000;

      if (aPrice !== bPrice) {
        return aPrice - bPrice;
      } else if (aSeats !== bSeats) {
        return bSeats - aSeats;
      } else {
        return bDepartureTime - aDepartureTime;
      }
    });

    res.json(filteredTrains);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
});

``
