require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const connectDB = require("../src/config/db");
const MenuItem = require("../src/models/MenuItem");

const BRANCH_ID = "6ad0e90a53cc462cbaaec9fa";

const IMAGE_DIRECTORY = path.join(
  __dirname,
  "../../client/public/images/menu"
);

const existingIds = {
  "Chicken Tikka": "6ad4c173f7999e7a95c61e91",
  "Farmhouse Pizza": "6ad48a0d1a91461afdbb14c5",
  "Jalebi with Rabri": "6ad3617e59fb4791fe2ad76f",
};

const menuItems = [
  // STARTERS — 8
  {
    name: "Paneer Tikka",
    category: "Starters",
    description: "Chargrilled paneer marinated in yogurt, herbs, and Indian spices.",
    image: "paneer-tikka.png",
    price: 280,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["paneer", "yogurt", "ginger", "garlic", "Indian spices"],
  },
  {
    name: "Veg Spring Rolls",
    category: "Starters",
    description: "Crispy golden rolls filled with seasoned vegetables, served with dipping sauce.",
    image: "veg-spring-rolls.png",
    price: 220,
    dietary: "Vegan",
    spice: "Mild",
    ingredients: ["cabbage", "carrot", "capsicum", "spring roll pastry"],
  },
  {
    name: "Chicken Tikka",
    category: "Starters",
    description: "Tender chicken marinated in aromatic spices and grilled to perfection.",
    image: "chicken-tikka.png",
    price: 340,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    ingredients: ["chicken", "yogurt", "ginger", "garlic", "Indian spices"],
  },
  {
    name: "Crispy Corn",
    category: "Starters",
    description: "Crispy golden corn tossed with spices and fresh herbs.",
    image: "crispy-corn.png",
    price: 210,
    dietary: "Vegan",
    spice: "Medium",
    ingredients: ["sweet corn", "cornflour", "spices", "fresh herbs"],
  },
  {
    name: "Honey Chilli Potato",
    category: "Starters",
    description: "Crispy potato fingers tossed in a sweet and spicy chilli glaze.",
    image: "honey-chilli-potato.png",
    price: 230,
    dietary: "Vegetarian",
    spice: "Hot",
    ingredients: ["potato", "chilli sauce", "honey", "sesame", "spring onion"],
  },
  {
    name: "Hummus with Pita Bread",
    category: "Starters",
    description: "Creamy chickpea hummus served with warm pita bread.",
    image: "hummus-pita.png",
    price: 260,
    dietary: "Vegan",
    spice: "Mild",
    ingredients: ["chickpeas", "tahini", "lemon", "garlic", "pita bread"],
  },
  {
    name: "Tandoori Mushroom",
    category: "Starters",
    description: "Mushrooms marinated in yogurt and spices, cooked in tandoor-style heat.",
    image: "tandoori-mushroom.png",
    price: 270,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["mushrooms", "yogurt", "ginger", "garlic", "tandoori spices"],
  },
  {
    name: "Chicken Malai Tikka",
    category: "Starters",
    description: "Tender chicken in a creamy cheese and mild spice marinade, grilled.",
    image: "chicken-malai-tikka.png",
    price: 360,
    dietary: "Non-Vegetarian",
    spice: "Mild",
    ingredients: ["chicken", "cream", "cheese", "yogurt", "mild spices"],
  },

  // MAIN COURSE — 10
  {
    name: "Paneer Butter Masala",
    category: "Main Course",
    description: "Soft paneer in a rich tomato, butter, and cream gravy.",
    image: "paneer-butter-masala.png",
    price: 320,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["paneer", "tomato", "butter", "cream", "spices"],
  },
  {
    name: "Dal Makhani",
    category: "Main Course",
    description: "Slow-cooked black lentils finished with butter and cream.",
    image: "dal-makhani.png",
    price: 280,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["black lentils", "kidney beans", "butter", "cream", "tomato"],
  },
  {
    name: "Butter Chicken",
    category: "Main Course",
    description: "Grilled chicken in a smooth, mildly spiced tomato-butter gravy.",
    image: "butter-chicken.png",
    price: 420,
    dietary: "Non-Vegetarian",
    spice: "Mild",
    ingredients: ["chicken", "tomato", "butter", "cream", "spices"],
  },
  {
    name: "Veg Biryani",
    category: "Main Course",
    description: "Fragrant basmati rice layered with vegetables and aromatic spices.",
    image: "veg-biryani.png",
    price: 300,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["basmati rice", "mixed vegetables", "yogurt", "biryani spices"],
  },
  {
    name: "Chicken Dum Biryani",
    category: "Main Course",
    description: "Fragrant basmati rice layered with spiced chicken and slow-cooked dum-style.",
    image: "chicken-dum-biryani.png",
    price: 380,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    ingredients: ["basmati rice", "chicken", "yogurt", "biryani spices"],
  },
  {
    name: "Kadai Paneer",
    category: "Main Course",
    description: "Paneer and bell peppers cooked with aromatic kadai spices.",
    image: "kadai-paneer.png",
    price: 310,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["paneer", "bell peppers", "tomato", "onion", "kadai spices"],
  },
  {
    name: "Shahi Paneer",
    category: "Main Course",
    description: "Paneer in a rich, creamy tomato and cashew gravy.",
    image: "shahi-paneer.png",
    price: 330,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["paneer", "tomato", "cashew", "cream", "spices"],
  },
  {
    name: "Chole Bhature",
    category: "Main Course",
    description: "Spiced chickpea curry served with fluffy fried bhature.",
    image: "chole-bhature.png",
    price: 240,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["chickpeas", "flour", "onion", "tomato", "spices"],
  },
  {
    name: "Mushroom Masala",
    category: "Main Course",
    description: "Mushrooms simmered in an aromatic onion-tomato gravy.",
    image: "mushroom-masala.png",
    price: 290,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["mushrooms", "onion", "tomato", "ginger", "spices"],
  },
  {
    name: "Malai Kofta",
    category: "Main Course",
    description: "Soft vegetable and paneer dumplings in a creamy cashew gravy.",
    image: "malai-kofta.png",
    price: 320,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["paneer", "potato", "cashew", "cream", "spices"],
  },

  // PIZZA — 8
  {
    name: "Margherita Pizza",
    category: "Pizza",
    description: "Classic pizza topped with tomato sauce, mozzarella, and fresh basil.",
    image: "margherita-pizza.png",
    price: 299,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["pizza dough", "tomato sauce", "mozzarella", "basil"],
  },
  {
    name: "Farmhouse Pizza",
    category: "Pizza",
    description: "Pizza topped with capsicum, onion, mushrooms, and melted cheese.",
    image: "farmhouse-pizza.png",
    price: 379,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["pizza dough", "capsicum", "onion", "mushrooms", "mozzarella"],
  },
  {
    name: "Chicken Tikka Pizza",
    category: "Pizza",
    description: "Grilled chicken tikka, peppers, and mozzarella on a seasoned pizza base.",
    image: "chicken-tikka-pizza.png",
    price: 449,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    ingredients: ["pizza dough", "chicken tikka", "peppers", "mozzarella"],
  },
  {
    name: "Four Cheese Pizza",
    category: "Pizza",
    description: "Pizza topped with a blend of four cheeses and tomato sauce.",
    image: "four-cheese-pizza.png",
    price: 429,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["pizza dough", "tomato sauce", "mozzarella", "cheddar", "parmesan", "gorgonzola"],
  },
  {
    name: "Pepperoni Pizza",
    category: "Pizza",
    description: "Pizza topped with mozzarella and pepperoni slices.",
    image: "pepperoni-pizza.png",
    price: 479,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    ingredients: ["pizza dough", "tomato sauce", "mozzarella", "pepperoni"],
  },
  {
    name: "Paneer Tikka Pizza",
    category: "Pizza",
    description: "Spiced paneer tikka, peppers, and cheese on a pizza base.",
    image: "paneer-tikka-pizza.png",
    price: 399,
    dietary: "Vegetarian",
    spice: "Medium",
    ingredients: ["pizza dough", "paneer tikka", "peppers", "mozzarella"],
  },
  {
    name: "Corn & Cheese Pizza",
    category: "Pizza",
    description: "Sweet corn, mozzarella, and creamy cheese on a pizza base.",
    image: "corn-cheese-pizza.png",
    price: 329,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["pizza dough", "sweet corn", "mozzarella", "cheese"],
  },
  {
    name: "Peri Peri Chicken Pizza",
    category: "Pizza",
    description: "Spicy peri-peri chicken, peppers, and mozzarella on a pizza base.",
    image: "peri-peri-chicken-pizza.png",
    price: 459,
    dietary: "Non-Vegetarian",
    spice: "Hot",
    ingredients: ["pizza dough", "chicken", "peri-peri seasoning", "peppers", "mozzarella"],
  },

  // DESSERTS — 7
  {
    name: "Sizzling Chocolate Brownie",
    category: "Desserts",
    description: "Warm chocolate brownie served with vanilla ice cream and rich chocolate sauce.",
    image: "sizzling-chocolate-brownie.png",
    price: 249,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["chocolate brownie", "vanilla ice cream", "chocolate sauce"],
  },
  {
    name: "Lotus Biscoff Cheesecake",
    category: "Desserts",
    description: "Creamy cheesecake topped with caramelised Biscoff spread and biscuit crumbs.",
    image: "lotus-biscoff-cheesecake.png",
    price: 299,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["cream cheese", "Biscoff spread", "biscuit crumbs", "cream"],
  },
  {
    name: "Jalebi with Rabri",
    category: "Desserts",
    description: "Crisp, golden jalebi served with thick, creamy rabri.",
    image: "jalebi-rabri.png",
    price: 229,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["flour", "sugar syrup", "milk", "cardamom"],
  },
  {
    name: "Gulab Jamun",
    category: "Desserts",
    description: "Soft milk-solid dumplings soaked in fragrant sugar syrup.",
    image: "gulab-jamun.png",
    price: 160,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["milk solids", "flour", "sugar syrup", "cardamom"],
  },
  {
    name: "Tiramisu",
    category: "Desserts",
    description: "Layered coffee-soaked sponge and mascarpone-style cream dusted with cocoa.",
    image: "tiramisu.png",
    price: 320,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["sponge cake", "coffee", "mascarpone-style cream", "cocoa"],
  },
  {
    name: "Classic New York Cheesecake",
    category: "Desserts",
    description: "Rich baked cheesecake with a smooth cream cheese filling.",
    image: "new-york-cheesecake.png",
    price: 280,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["cream cheese", "sugar", "eggs", "biscuit crust"],
  },
  {
    name: "Chocolate Lava Cake",
    category: "Desserts",
    description: "Warm chocolate cake with a molten chocolate center.",
    image: "chocolate-lava-cake.png",
    price: 220,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["chocolate", "flour", "butter", "sugar", "eggs"],
  },

  // BEVERAGES — 7
  {
    name: "Fresh Lime Soda",
    category: "Beverages",
    description: "Refreshing lime drink with soda and fresh lime, served chilled.",
    image: "fresh-lime-soda.png",
    price: 120,
    dietary: "Vegan",
    spice: "Mild",
    ingredients: ["lime", "soda water", "sugar", "ice"],
  },
  {
    name: "Mango Lassi",
    category: "Beverages",
    description: "Creamy yogurt blended with ripe mango.",
    image: "mango-lassi.png",
    price: 160,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["mango", "yogurt", "milk", "sugar"],
  },
  {
    name: "Iced Coffee",
    category: "Beverages",
    description: "Chilled coffee blended with milk and served over ice.",
    image: "iced-coffee.png",
    price: 180,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["coffee", "milk", "ice", "sugar"],
  },
  {
    name: "Chocolate Milkshake",
    category: "Beverages",
    description: "Creamy milkshake blended with chocolate and chilled milk.",
    image: "chocolate-milkshake.png",
    price: 210,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["milk", "chocolate", "ice cream"],
  },
  {
    name: "Fresh Watermelon Juice",
    category: "Beverages",
    description: "Freshly blended watermelon served chilled.",
    image: "watermelon-juice.png",
    price: 150,
    dietary: "Vegan",
    spice: "Mild",
    ingredients: ["watermelon", "ice"],
  },
  {
    name: "Blueberry Mojito (Mocktail)",
    category: "Beverages",
    description: "Blueberry, mint, lime, and soda in a refreshing non-alcoholic drink.",
    image: "blueberry-mojito.png",
    price: 190,
    dietary: "Vegan",
    spice: "Mild",
    ingredients: ["blueberries", "mint", "lime", "soda water", "ice"],
  },
  {
    name: "Masala Chai",
    category: "Beverages",
    description: "Indian tea brewed with milk and aromatic spices.",
    image: "masala-chai.png",
    price: 90,
    dietary: "Vegetarian",
    spice: "Mild",
    ingredients: ["tea", "milk", "ginger", "cardamom", "spices"],
  },
];

async function main() {
  const isImport = process.argv.includes("--import");

  try {
    // Validate the data before connecting to the database.
    if (menuItems.length !== 40) {
      throw new Error(`Expected 40 menu items, found ${menuItems.length}.`);
    }

    const allowedCategories = [
      "Starters",
      "Main Course",
      "Pizza",
      "Desserts",
      "Beverages",
    ];

    const allowedDietary = ["Vegetarian", "Vegan", "Non-Vegetarian"];
    const allowedSpice = ["Mild", "Medium", "Hot"];
    const names = menuItems.map((item) => item.name);

    if (new Set(names).size !== menuItems.length) {
      throw new Error("Duplicate menu item names detected.");
    }

    for (const item of menuItems) {
      if (!allowedCategories.includes(item.category)) {
        throw new Error(`Invalid category for ${item.name}: ${item.category}`);
      }

      if (!allowedDietary.includes(item.dietary)) {
        throw new Error(`Invalid dietary value for ${item.name}.`);
      }

      if (!allowedSpice.includes(item.spice)) {
        throw new Error(`Invalid spice value for ${item.name}.`);
      }

      if (!Number.isFinite(item.price) || item.price <= 0) {
        throw new Error(`Invalid price for ${item.name}.`);
      }

      if (!fs.existsSync(path.join(IMAGE_DIRECTORY, item.image))) {
        throw new Error(`Image missing for ${item.name}: ${item.image}`);
      }

      item.image = `/images/menu/${item.image}`;
    }

    console.log("Local validation passed.");
    console.log(`Total menu items: ${menuItems.length}`);
    console.log(
      "Category counts:",
      menuItems.reduce((counts, item) => {
        counts[item.category] = (counts[item.category] || 0) + 1;
        return counts;
      }, {})
    );
    console.log("All 40 image files exist.");

    if (!isImport) {
      console.log("\nDRY RUN ONLY: MongoDB has not been modified.");
      console.log("After reviewing this output, use --import to write the menu.");
      return;
    }

    await connectDB();

    const existingRecords = await MenuItem.find({ branchId: BRANCH_ID })
      .select("_id name")
      .lean();

    const existingById = new Map(
      existingRecords.map((record) => [String(record._id), record])
    );

    // Verify that all three existing documents are present before importing.
for (const [name, id] of Object.entries(existingIds)) {
  if (!existingById.has(id)) {
    throw new Error(
      `Expected existing document for "${name}" with ID ${id} was not found.`
    );
  }
}

const branchObjectId = new mongoose.Types.ObjectId(BRANCH_ID);

for (const item of menuItems) {
  const existingId = existingIds[item.name];

  const document = {
    ...item,
    branchId: branchObjectId,
  };

  if (existingId) {
    // Update the existing document without changing its MongoDB ID.
    const result = await MenuItem.updateOne(
      { _id: existingId, branchId: BRANCH_ID },
      { $set: document },
      { runValidators: true }
    );

    if (result.matchedCount !== 1) {
      throw new Error(
        `Could not update the existing document for "${item.name}".`
      );
    }
  } else {
    // Update an existing menu item if present; otherwise create it.
    // This also makes the script safer to rerun after a partial import.
    await MenuItem.findOneAndUpdate(
      {
        branchId: branchObjectId,
        name: item.name,
      },
      { $set: document },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }
}
    const finalRecords = await MenuItem.find({ branchId: BRANCH_ID })
      .select("_id name category price image")
      .lean();

    if (finalRecords.length !== 40) {
      throw new Error(
        `Import finished, but expected 40 records and found ${finalRecords.length}. Review the database before retrying.`
      );
    }

    console.log("\nMenu import completed successfully.");
    console.log(`Verified menu records: ${finalRecords.length}`);
    console.log("The three existing MongoDB document IDs were preserved.");
  } catch (error) {
    console.error("\nMenu script failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }
}

main();