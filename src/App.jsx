import React, { useState, useMemo } from "react";

// Hotel Reservation UI App - single-file React component
// Usage: place this as App.jsx (or default export) inside a CRA / Vite React project using Tailwind.

export default function HotelReservationUI() {
  // Build rooms data structure
  const buildRooms = () => {
    const rooms = [];
    for (let floor = 1; floor <= 9; floor++) {
      for (let i = 1; i <= 10; i++) {
        const roomNumber = floor * 100 + i;
        rooms.push({ floor, pos: i, number: roomNumber.toString(), occupied: false });
      }
    }
    // floor 10 rooms 1001-1007, pos 1..7
    for (let i = 1; i <= 7; i++) {
      const roomNumber = 1000 + i;
      rooms.push({ floor: 10, pos: i, number: roomNumber.toString(), occupied: false });
    }
    return rooms;
  };

  const [rooms, setRooms] = useState(buildRooms);
  const [selectedAssigned, setSelectedAssigned] = useState([]);
  const [requestCount, setRequestCount] = useState(1);
  const [message, setMessage] = useState("");

  // helper: get available rooms
  const availableRooms = useMemo(() => rooms.filter(r => !r.occupied), [rooms]);

  // travel time between two rooms
  const travelBetween = (a, b) => {
    if (a.floor === b.floor) return Math.abs(a.pos - b.pos) * 1;
    const floorDiff = Math.abs(a.floor - b.floor);
    return (a.pos - 1) + (b.pos - 1) + 2 * floorDiff;
  };

  // total minimum travel time for a set of rooms
  const minTravelForSet = (set) => {
    const perms = permute(set);
    let best = Infinity;
    for (const p of perms) {
      let total = 0;
      for (let i = 0; i < p.length - 1; i++) total += travelBetween(p[i], p[i + 1]);
      if (total < best) best = total;
    }
    return best === Infinity ? 0 : best;
  };

  // permutations helper (small k)
  const permute = (arr) => {
    const res = [];
    const backtrack = (cur, used) => {
      if (cur.length === arr.length) {
        res.push(cur.slice());
        return;
      }
      for (let i = 0; i < arr.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        cur.push(arr[i]);
        backtrack(cur, used);
        cur.pop();
        used[i] = false;
      }
    };
    backtrack([], Array(arr.length).fill(false));
    return res;
  };

  // Try same-floor optimal selection
  const trySameFloor = (k) => {
    const floors = {};
    rooms.forEach(r => {
      if (!r.occupied) {
        floors[r.floor] = floors[r.floor] || [];
        floors[r.floor].push(r);
      }
    });

    let best = null;
    for (const f in floors) {
      const arr = floors[f].slice().sort((a, b) => a.pos - b.pos);
      if (arr.length < k) continue;
      for (let i = 0; i + k - 1 < arr.length; i++) {
        const slice = arr.slice(i, i + k);
        const travel = minTravelForSet(slice);
        if (!best || travel < best.travel) {
          best = { rooms: slice, travel };
        }
      }
    }
    return best;
  };

  // General search across floors
  const tryAcrossFloors = (k) => {
    const avail = rooms.filter(r => !r.occupied).sort((a, b) => (a.floor - b.floor) || (a.pos - b.pos));
    if (avail.length < k) return null;
    const limit = Math.min(avail.length, 22 + k * 6);
    const candidates = avail.slice(0, limit);
    const combs = combinations(candidates, k);
    let best = null;
    for (const comb of combs) {
      const travel = minTravelForSet(comb);
      if (!best || travel < best.travel) best = { rooms: comb, travel };
    }
    return best;
  };

  // combinations generator
  const combinations = (arr, k) => {
    const res = [];
    const choose = (start, cur) => {
      if (cur.length === k) {
        res.push(cur.slice());
        return;
      }
      for (let i = start; i < arr.length; i++) {
        cur.push(arr[i]);
        choose(i + 1, cur);
        cur.pop();
        if (res.length > 35000) break;
      }
    };
    choose(0, []);
    return res;
  };

  const findBestAssignment = (k) => {
    if (k < 1 || k > 5) return { err: "Request must be between 1 and 5 rooms." };
    const available = rooms.filter(r => !r.occupied);
    if (available.length < k) return { err: `Only ${available.length} rooms available.` };

    const sameFloor = trySameFloor(k);
    if (sameFloor) return sameFloor;
    const across = tryAcrossFloors(k);
    if (across) return across;
    return { err: "Could not find optimal combination." };
  };

  const handleBook = () => {
    setMessage("");
    const k = Number(requestCount);
    const result = findBestAssignment(k);
    if (result && result.err) {
      setMessage(result.err);
      setSelectedAssigned([]);
      return;
    }
    const assignedNumbers = result.rooms.map(r => r.number);
    setRooms(prev => prev.map(r => ({ ...r, occupied: assignedNumbers.includes(r.number) ? true : r.occupied })));
    setSelectedAssigned(result.rooms.map(r => ({ ...r })));
    setMessage(`Booked ${k} rooms. Total travel time: ${result.travel} minute(s).`);
  };

  const handleRandom = () => {
    const chance = 0.3;
    setSelectedAssigned([]);
    setMessage("");
    setRooms(prev => prev.map(r => ({ ...r, occupied: Math.random() < chance })));
  };

  const handleReset = () => {
    setRooms(buildRooms());
    setSelectedAssigned([]);
    setMessage("");
  };

  const toggleRoom = (roomNumber) => {
    setRooms(prev => prev.map(r => r.number === roomNumber ? { ...r, occupied: !r.occupied } : r));
  };

  const floors = [];
  for (let f = 10; f >= 1; f--) {
    floors.push({ floor: f, rooms: rooms.filter(r => r.floor === f).sort((a, b) => a.pos - b.pos) });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto bg-white/5 rounded-2xl shadow-2xl p-6">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Hotel Room Reservation</h1>
            <p className="text-sm text-slate-300 mt-1">"Book your stay today—comfort and convenience just a click away!"</p>
          </div>
          <div className="space-x-2">
            <button onClick={handleRandom} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold shadow">Generate Random Occupancy</button>
            <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow">Reset</button>
          </div>
        </header>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 p-4 bg-white/3 rounded-xl">
            <h2 className="font-semibold">Book Rooms</h2>
            <p className="text-sm text-slate-300 mb-4">Enter number of rooms (1–5) and press Book.</p>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={5}
                value={requestCount}
                onChange={e => setRequestCount(Number(e.target.value))}
                className="w-24 p-2 rounded-md bg-white/10"
              />
              <button onClick={handleBook} className="px-4 py-2 rounded-lg bg-emerald-400 text-slate-900 font-semibold">Book</button>
            </div>
            <div className="mt-4">
              <p className="text-sm text-amber-200">{message}</p>
              {selectedAssigned.length > 0 && (
                <div className="mt-3 bg-white/5 p-3 rounded">
                  <div className="flex flex-wrap gap-2">
                    {selectedAssigned.map(s => (
                      <div key={s.number} className="px-3 py-1 rounded bg-emerald-500 text-slate-900 font-bold">{s.number}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 text-sm text-slate-300">
              <p><strong>Legend:</strong></p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-green-500" /> Available</div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-rose-500" /> Occupied</div>
                <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-amber-400" /> Selected</div>
              </div>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 p-4 bg-white/5 rounded-xl">
            <h2 className="font-semibold mb-3">Building View</h2>
            <div className="space-y-3">
              {floors.map(f => (
                <div key={f.floor} className="p-3 bg-gradient-to-r from-slate-800/40 to-slate-700/20 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 text-center text-lg font-bold">{f.floor}</div>
                      <div className="text-sm text-slate-400">Floor {f.floor}</div>
                    </div>
                    <div className="text-xs text-slate-400">Stairs/Lift on left</div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {f.rooms.map(r => {
                      const isSelected = selectedAssigned.find(x => x.number === r.number);
                      return (
                        <div
                          key={r.number}
                          onClick={() => toggleRoom(r.number)}
                          className={`min-w-[72px] cursor-pointer p-2 rounded-lg text-center text-sm select-none shadow-inner transition-transform transform hover:-translate-y-1 ${
                            isSelected ? "bg-amber-400 text-slate-900 font-bold"
                              : r.occupied ? "bg-rose-500 text-white"
                              : "bg-green-600 text-white"
                          }`}
                        >
                          <div className="text-xs text-slate-200">{r.number}</div>
                          <div className="text-[10px] text-slate-100">{r.occupied ? "Occupied" : "Free"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <footer className="mt-6 text-sm text-slate-400">
          <div>Notes: The system prefers rooms on the same floor; otherwise it finds a set which minimizes total travel time between rooms based on stairs at left and vertical travel costing 2 minutes per floor and horizontal costing 1 minute per adjacent room.</div>
        </footer>
      </div>
    </div>
  );
}
