export const branches = [
  {
    id: 1,
    name: "Vadodara Branch",
    city: "Vadodara"
  },
  {
    id: 2,
    name: "Ahmedabad Branch",
    city: "Ahmedabad"
  },
  {
    id: 3,
    name: "Surat Branch",
    city: "Surat"
  }
];

export const orders = [
  {
    id: "ORD-1001",
    customer: "Rahul Shah",
    branch: "Vadodara Branch",
    table: "Table 08",
    items: ["Paneer Pizza", "Coke"],
    amount: 640,
    status: "Preparing"
  },
  {
    id: "ORD-1002",
    customer: "Priya Patel",
    branch: "Ahmedabad Branch",
    table: "Table 03",
    items: ["Veg Pasta", "Garlic Bread"],
    amount: 520,
    status: "Ready"
  },
  {
    id: "ORD-1003",
    customer: "Aarav Mehta",
    branch: "Surat Branch",
    table: "Online",
    items: ["Burger Combo"],
    amount: 450,
    status: "Delivered"
  },
  {
    id: "ORD-1004",
    customer: "Neha Joshi",
    branch: "Vadodara Branch",
    table: "Table 05",
    items: ["Biryani", "Lassi"],
    amount: 390,
    status: "Pending"
  }
];

export const inventory = [
  {
    id: 1,
    item: "Paneer",
    quantity: 8,
    unit: "kg",
    status: "Available"
  },
  {
    id: 2,
    item: "Mozzarella",
    quantity: 2,
    unit: "kg",
    status: "Low Stock"
  },
  {
    id: 3,
    item: "Tomato",
    quantity: 18,
    unit: "kg",
    status: "Available"
  },
  {
    id: 4,
    item: "Cooking Oil",
    quantity: 1.2,
    unit: "litre",
    status: "Critical"
  },
  {
    id: 5,
    item: "Basmati Rice",
    quantity: 25,
    unit: "kg",
    status: "Available"
  }
];