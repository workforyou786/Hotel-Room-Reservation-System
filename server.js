import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Build initial rooms
function buildRooms() {
  const rooms = [];
  for (let floor = 1; floor <= 9; floor++) {
    for (let i = 1; i <= 10; i++) {
      rooms.push({ floor, pos: i, number: floor * 100 + i, occupied: false });
    }
  }
  for (let i = 1; i <= 7; i++) {
    rooms.push({ floor: 10, pos: i, number: 1000 + i, occupied: false });
  }
  return rooms;
}

let rooms = buildRooms();

// --- APIs ---
// Get all rooms
app.get("/rooms", (req, res) => {
  res.json(rooms);
});

// Reset
app.post("/reset", (req, res) => {
  rooms = buildRooms();
  res.json({ success: true });
});

// Random occupancy
app.post("/randomize", (req, res) => {
  const chance = 0.3;
  rooms = rooms.map(r => ({ ...r, occupied: Math.random() < chance }));
  res.json({ success: true, rooms });
});

// Book rooms (simple version: pick first N free)
app.post("/book", (req, res) => {
  const { count } = req.body;
  if (!count || count < 1 || count > 5) {
    return res.status(400).json({ error: "Count must be 1–5" });
  }
  const available = rooms.filter(r => !r.occupied);
  if (available.length < count) {
    return res.status(400).json({ error: "Not enough free rooms" });
  }

  // pick first N (replace with optimal algo if needed)
  const selected = available.slice(0, count);
  const numbers = selected.map(r => r.number);

  rooms = rooms.map(r =>
    numbers.includes(r.number) ? { ...r, occupied: true } : r
  );

  res.json({ booked: numbers });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
