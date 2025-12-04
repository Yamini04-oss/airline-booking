/* script.js - Handles navigation, state, seat selection and auto-pick logic
   Uses localStorage to keep temporary booking data across pages.
*/

// Namespace for the app
const App = {
  stateKey: 'skytravel_booking',
  defaultFare: 2499,
  defaultFees: 499,
};

// Utility: load/save state
App.loadState = function() {
  try {
    const raw = localStorage.getItem(this.stateKey);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

App.saveState = function(state) {
  localStorage.setItem(this.stateKey, JSON.stringify(state));
};

// Handle login - accept any credentials for demo
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const state = App.loadState();
  state.user = { username };
  App.saveState(state);
  window.location.href = 'flight-search.html';
}

// Handle search submission
function handleSearch(e) {
  e.preventDefault();
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  const depart = document.getElementById('depart').value;
  const ret = document.getElementById('returnDate') ? document.getElementById('returnDate').value : (document.getElementById('return') ? document.getElementById('return').value : '');
  const passengers = parseInt(document.getElementById('passengers').value, 10);

  const state = App.loadState();
  state.search = { from, to, depart, return: ret, passengers };
  App.saveState(state);
  // For demo generate some fake flights and go to flights page
  window.location.href = 'flight-results.html';
}

// Generate demo flight data based on search
App.generateFlights = function() {
  const state = this.loadState();
  const base = state.search || { from: 'City A', to: 'City B' };
  const airlines = [
    { name: 'SkyAir', code: 'SK' },
    { name: 'AeroJet', code: 'AJ' },
    { name: 'VentureAir', code: 'VA' }
  ];

  const flights = [];
  for (let i = 0; i < 6; i++) {
    const airline = airlines[i % airlines.length];
    const departHour = 6 + i * 2;
    const arriveHour = departHour + (2 + (i % 3));
    const duration = `${2 + (i % 3)}h ${15 * (i % 4)}m`;
    const price = App.defaultFare + (i * 500);
    flights.push({
      id: 'FL' + (1000 + i),
      airline: airline.name,
      code: airline.code + (300 + i),
      from: base.from || 'City A',
      to: base.to || 'City B',
      depart: `${String(departHour).padStart(2,'0')}:00`,
      arrive: `${String(arriveHour).padStart(2,'0')}:30`,
      duration,
      price
    });
  }

  state.flights = flights;
  this.saveState(state);
  return flights;
};

// Render flights on flights.html
function renderFlights() {
  const list = document.getElementById('flightsList');
  if (!list) return;
  const flights = App.generateFlights();
  list.innerHTML = '';
  flights.forEach(f => {
    const el = document.createElement('div');
    el.className = 'flight-card card';
    el.innerHTML = `
      <div class="flight-header">
        <div>
          <div class="airline-name">${f.airline}</div>
          <div class="flight-number">${f.code} • ${f.id}</div>
        </div>
        <div style="text-align:right;">
          <div class="flight-price">₹ ${f.price}</div>
          <div class="flight-price-label">Starting</div>
        </div>
      </div>
      <div class="flight-details">
        <div class="flight-route">
          <div class="flight-time">
            <div class="time">${f.depart}</div>
            <div class="airport">${f.from}</div>
          </div>

          <div style="display:flex; align-items:center;">
            <div class="flight-arrow"></div>
            <div style="margin-left:12px; color:var(--text-light);">${f.duration}</div>
          </div>

          <div class="flight-time">
            <div class="time">${f.arrive}</div>
            <div class="airport">${f.to}</div>
          </div>
        </div>

        <div class="flight-info">
          <div style="font-size:13px; color:var(--text-light);">Economy • Refundable</div>
          <div>
            <button class="select-btn" onclick="selectFlight('${f.id}')">Select Flight</button>
          </div>
        </div>
      </div>
    `;
    list.appendChild(el);
  });
}

// When user selects a flight
function selectFlight(flightId) {
  const state = App.loadState();
  const flights = state.flights || [];
  const flight = flights.find(f => f.id === flightId);
  state.selectedFlight = flight;
  App.saveState(state);
  // go to seat selection
  window.location.href = 'seat-selection.html';
}

/* ===== SEAT MAP & SELECTION LOGIC ===== */
// Creates a seatmap with rows and some blocked seats.
App.createSeatMap = function() {
  // Realistic seat map A-F, rows 1..30. We'll mark some seats as booked.
  const seats = [];
  const letters = ['A','B','C','D','E','F'];
  const rows = 30;
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < letters.length; c++) {
      const id = `${r}${letters[c]}`;
      // pricing: window seats (A,F) +200, aisle (C,D) +100, middle base
      let price = App.defaultFare;
      if (letters[c] === 'A' || letters[c] === 'F') price += 200;
      else if (letters[c] === 'C' || letters[c] === 'D') price += 100;

      seats.push({ id, row: r, col: c, seatLetter: letters[c], price, status: 'available' });
    }
  }

  // mark some seats as booked (demo pattern)
  const bookedList = [];
  // Book a few seats across front/mid/back
  for (let r of [2,3,5,8,12,15,18,22,25,28]) {
    bookedList.push(`${r}A`, `${r}C`, `${r}F`);
  }
  bookedList.forEach(sid => {
    const s = seats.find(x=>x.id===sid);
    if (s) s.status = 'booked';
  });

  // mark exit row as slightly different (example) - keep as available but visual can be same
  return seats;
};

// Render seat map on seats.html
function renderSeatMap() {
  const seatMapEl = document.getElementById('seatMap');
  if (!seatMapEl) return;
  const state = App.loadState();
  const passengers = (state.search && state.search.passengers) || 1;
  document.getElementById('summaryPassengers').textContent = passengers;

  if (!state.seats) {
    state.seats = App.createSeatMap();
    App.saveState(state);
  }

  const seats = state.seats;
  seatMapEl.innerHTML = '';

  // Build rows 1..30 with A B C  (aisle) D E F
  const rows = {};
  seats.forEach(s => { rows[s.row] = rows[s.row] || []; rows[s.row].push(s); });
  const rowNums = Object.keys(rows).map(Number).sort((a,b)=>a-b);

  rowNums.forEach(rn => {
    const rowEl = document.createElement('div');
    rowEl.className = 'seat-row';

    const label = document.createElement('div');
    label.className = 'row-number';
    label.textContent = rn;
    rowEl.appendChild(label);

    const leftGroup = document.createElement('div');
    leftGroup.className = 'seat-group';
    const rightGroup = document.createElement('div');
    rightGroup.className = 'seat-group';
    const aisle = document.createElement('div');
    aisle.className = 'aisle';

    const rowSeats = rows[rn].sort((a,b)=>a.col - b.col);
    // A B C -> leftGroup; D E F -> rightGroup
    rowSeats.forEach(s => {
      const seatEl = document.createElement('button');
      seatEl.type = 'button';
      seatEl.className = 'seat small';
      if (s.status === 'booked') seatEl.classList.add('blocked');
      else seatEl.classList.add('available');
      if (s.selected) seatEl.classList.add('selected');
      seatEl.textContent = s.seatLetter;
      seatEl.title = `${s.id} — ₹ ${s.price}`;
      seatEl.dataset.id = s.id;
      seatEl.addEventListener('click', () => toggleSeatSelection(s.id));

      // premium highlight for window seats
      if (s.seatLetter === 'A' || s.seatLetter === 'F') {
        seatEl.style.backgroundImage = 'linear-gradient(90deg,var(--secondary-blue),var(--accent-purple))';
        seatEl.style.color = 'white';
        if (s.status === 'booked') {
          seatEl.style.backgroundImage = '';
        }
      }

      if (s.seatLetter === 'A' || s.seatLetter === 'B' || s.seatLetter === 'C') leftGroup.appendChild(seatEl);
      else rightGroup.appendChild(seatEl);
    });

    rowEl.appendChild(leftGroup);
    rowEl.appendChild(aisle);
    rowEl.appendChild(rightGroup);

    seatMapEl.appendChild(rowEl);
  });

  updateSummary();
}

function toggleSeatSelection(seatId) {
  const state = App.loadState();
  const seat = state.seats.find(s => s.id === seatId);
  if (!seat || seat.status === 'blocked') return;
  if (seat.status === 'booked') return; // can't select booked seats

  seat.selected = !seat.selected;

  // ensure not selecting more than passengers
  const passengers = (state.search && state.search.passengers) || 1;
  const selectedSeats = state.seats.filter(s => s.selected);
  if (selectedSeats.length > passengers) {
    // if too many, unselect earliest selected
    selectedSeats[0].selected = false;
  }

  App.saveState(state);
  renderSeatMap();
}

function updateSummary() {
  const state = App.loadState();
  const seats = state.seats || [];
  const selected = seats.filter(s => s.selected).map(s => s.id);
  document.getElementById('summarySeats').textContent = selected.length ? selected.join(', ') : '-';
  const passengers = (state.search && state.search.passengers) || 1;
  const pricePer = App.defaultFare;
  document.getElementById('summaryPricePer').textContent = `₹ ${pricePer}`;
  const total = pricePer * Math.max(selected.length, passengers);
  document.getElementById('summaryTotal').textContent = `₹ ${total}`;
}

// Greedy knapsack-like auto-select: choose best contiguous seats near front
function autoSelectSeats() {
  const state = App.loadState();
  const seats = state.seats || [];
  const passengers = (state.search && state.search.passengers) || 1;

  // Simple greedy: prefer lower row numbers and contiguous groups
  const available = seats.filter(s => s.status === 'available');
  // group by row
  const rows = {};
  available.forEach(s => {
    rows[s.row] = rows[s.row] || [];
    rows[s.row].push(s);
  });

  // sort rows ascending
  const rowNumbers = Object.keys(rows).map(Number).sort((a,b)=>a-b);
  let selected = [];

  for (const r of rowNumbers) {
    const group = rows[r].sort((a,b) => a.col - b.col);
    // try sliding window for contiguous seats
    for (let i = 0; i <= group.length - 1; i++) {
      const window = group.slice(i, i + passengers);
      if (window.length < passengers) continue;
      // ensure none blocked and contiguous by column index
      let contiguous = true;
      for (let j = 1; j < window.length; j++) {
        if (window[j].col !== window[j-1].col + 1) { contiguous = false; break; }
      }
      if (!contiguous) continue;
      selected = window.map(s => s.id);
      break;
    }
    if (selected.length) break;
  }

  // if not found contiguous, pick cheapest available (greedy by row)
  if (!selected.length) {
    for (const r of rowNumbers) {
      const group = rows[r].sort((a,b) => a.col - b.col);
      for (const s of group) {
        if (selected.length < passengers) selected.push(s.id);
      }
      if (selected.length >= passengers) break;
    }
  }

  // apply selection to state
  state.seats.forEach(s => s.selected = selected.includes(s.id));
  App.saveState(state);
  renderSeatMap();
}

function continueToPayment() {
  const state = App.loadState();
  const selectedSeats = (state.seats || []).filter(s => s.selected).map(s => s.id);
  const passengers = (state.search && state.search.passengers) || 1;
  if (selectedSeats.length < passengers) {
    alert('Please select seats for all passengers or use Auto-select.');
    return;
  }
  state.selectedSeats = selectedSeats;
  App.saveState(state);
  window.location.href = 'payment.html';
}

/* ===== PAYMENT PAGE ===== */
function renderPaymentPage() {
  const state = App.loadState();
  const flight = state.selectedFlight || { airline: '-', code: '-', id: '-' };
  const seats = state.selectedSeats || [];
  const passengers = (state.search && state.search.passengers) || 1;

  const payFlight = document.getElementById('payFlight');
  const paySeats = document.getElementById('paySeats');
  const payPassengers = document.getElementById('payPassengers');
  const payFare = document.getElementById('payFare');
  const payFees = document.getElementById('payFees');
  const payTotal = document.getElementById('payTotal');
  const passengerInfo = document.getElementById('passengerInfo');

  if (payFlight) payFlight.textContent = `${flight.airline} • ${flight.code}`;
  if (paySeats) paySeats.textContent = seats.length ? seats.join(', ') : '-';
  if (payPassengers) payPassengers.textContent = passengers;
  if (payFare) payFare.textContent = `₹ ${App.defaultFare}`;
  if (payFees) payFees.textContent = `₹ ${App.defaultFees}`;

  const total = (App.defaultFare * seats.length) + App.defaultFees;
  if (payTotal) payTotal.textContent = `₹ ${total}`;

  if (passengerInfo) {
    passengerInfo.innerHTML = '';
    for (let i = 0; i < passengers; i++) {
      const div = document.createElement('div');
      div.className = 'passenger-info';
      div.innerHTML = `<strong>Passenger ${i+1}</strong><div style="font-size:13px; margin-top:6px;">Seat: ${seats[i] || '-'}<br/>Fare: ₹ ${App.defaultFare}</div>`;
      passengerInfo.appendChild(div);
    }
  }
}

function confirmPayment() {
  // Save booking and go to confirmation
  const state = App.loadState();
  state.booking = {
    flight: state.selectedFlight || null,
    seats: state.selectedSeats || [],
    passengers: (state.search && state.search.passengers) || 1,
    total: (App.defaultFare * ((state.selectedSeats || []).length || 1)) + App.defaultFees
  };
  App.saveState(state);
  window.location.href = 'confirmation.html';
}

/* ===== PAGE BOOTSTRAP ===== */
window.addEventListener('DOMContentLoaded', () => {
  // Hook forms and buttons if present
  if (document.getElementById('searchForm')) {
    const state = App.loadState();
    if (state.search) {
      // prefill fields
      document.getElementById('from').value = state.search.from || '';
      document.getElementById('to').value = state.search.to || '';
      document.getElementById('depart').value = state.search.depart || '';
      const retEl = document.getElementById('returnDate') || document.getElementById('return');
      if (retEl) retEl.value = state.search.return || '';
      document.getElementById('passengers').value = state.search.passengers || '1';
    }
    // attach submit handler (in case inline onsubmit was removed)
    const sf = document.getElementById('searchForm');
    if (sf && !sf._searchHandlerAttached) {
      sf.addEventListener('submit', handleSearch);
      sf._searchHandlerAttached = true;
    }
  }

  if (document.getElementById('flightsList')) renderFlights();
  if (document.getElementById('seatMap')) {
    renderSeatMap();
    const autoBtn = document.getElementById('autoSelectBtn');
    autoBtn.addEventListener('click', autoSelectSeats);
    const contBtn = document.getElementById('continueToPayment');
    contBtn.addEventListener('click', continueToPayment);
  }
  if (document.getElementById('confirmPayment')) {
    renderPaymentPage();
    document.getElementById('confirmPayment').addEventListener('click', confirmPayment);
  }
  // Render confirmation page if present
  if (document.getElementById('confirmationContainer')) {
    renderConfirmationPage && renderConfirmationPage();
  }
});

// Render confirmation page
function renderConfirmationPage() {
  const state = App.loadState();
  const booking = state.booking || {};
  const container = document.getElementById('confirmationContainer');
  if (!container) return;
  container.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = 'Booking Confirmed';
  const p = document.createElement('p');
  p.textContent = 'Thank you for booking with SkyTravel. Below are your booking details.';
  container.appendChild(h);
  container.appendChild(p);

  const div = document.createElement('div');
  div.className = 'card';
  div.style.marginTop = '16px';
  div.innerHTML = `
    <div style="margin-bottom:8px;"><strong>Flight:</strong> ${booking.flight ? booking.flight.airline + ' • ' + booking.flight.code : '-'}</div>
    <div style="margin-bottom:8px;"><strong>Seats:</strong> ${booking.seats ? booking.seats.join(', ') : '-'}</div>
    <div style="margin-bottom:8px;"><strong>Passengers:</strong> ${booking.passengers || '-'}</div>
    <div style="margin-top:12px; font-weight:700; color:var(--secondary-blue);">Total Paid: ₹ ${booking.total || 0}</div>
  `;
  container.appendChild(div);
  // Optionally clear state for demo, keep user info
  localStorage.removeItem(App.stateKey);
}
