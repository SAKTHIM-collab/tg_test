// Example setup for 3 rings with 6 nodes each
const circuits = {
    outer: ["O1", "O2", "O3", "O4", "O5", "O6"],
    middle: ["M1", "M2", "M3", "M4", "M5", "M6"],
    inner: ["I1", "I2", "I3", "I4", "I5", "I6"]
  };
  
  // Define all edges and their weights
  const edges = [
    // Outer ring edges
    { from: "O1", to: "O2", weight: 1 },
    { from: "O2", to: "O3", weight: 1 },
    { from: "O3", to: "O4", weight: 1 },
    { from: "O4", to: "O5", weight: 1 },
    { from: "O5", to: "O6", weight: 1 },
    { from: "O6", to: "O1", weight: 1 },
  
    // Middle ring edges (example)
    { from: "M1", to: "M2", weight: 2 },
    { from: "M2", to: "M3", weight: 2 },
    { from: "M3", to: "M4", weight: 2 },
    { from: "M4", to: "M5", weight: 2 },
    { from: "M5", to: "M6", weight: 2 },
    { from: "M6", to: "M1", weight: 2 },
  
    // Add interconnections (O1 to M1, etc.), inner ring, etc.
  ];
  