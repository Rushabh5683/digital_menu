import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Local development demo accounts only — see docs/AUTH.md */
const DEMO_ACCOUNTS = {
  superAdmin: {
    name: 'Platform Super Admin',
    email: 'super@digitalmenu.local',
    password: 'SuperAdmin!23',
    role: 'SUPER_ADMIN',
  },
  restaurantAdmin: {
    name: 'Saffron Court Admin',
    email: 'admin@saffroncourt.local',
    password: 'RestaurantAdmin!23',
    role: 'RESTAURANT_ADMIN',
  },
};

const IMAGE = {
  paneerTikka:
    'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
  samosa:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
  soup:
    'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  kebab:
    'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80',
  salad:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  butterChicken:
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae958?auto=format&fit=crop&w=800&q=80',
  dal:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  palak:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
  curry:
    'https://images.unsplash.com/photo-1588168333986-5078d3ae3977?auto=format&fit=crop&w=800&q=80',
  naan:
    'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
  biryani:
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  dessert:
    'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=800&q=80',
  gulab:
    'https://images.unsplash.com/photo-1666190092159-3171cf0fbb12?auto=format&fit=crop&w=800&q=80',
  beverage:
    'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=800&q=80',
  lassi:
    'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=800&q=80',
  chai:
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=800&q=80',
  logo:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80',
};

const categories = [
  {
    name: 'Starters',
    description: 'Crisp beginnings and shareable plates to open the meal.',
    displayOrder: 1,
    dishes: [
      {
        name: 'Paneer Tikka',
        description:
          'Cottage cheese cubes marinated in hung curd and tandoori spices, finished over charcoal.',
        price: 280,
        imageUrl: IMAGE.paneerTikka,
        ingredients: ['paneer', 'yogurt', 'bell pepper', 'onion', 'tandoori masala'],
        dietaryTags: ['vegetarian', 'gluten-free', 'contains-dairy'],
      },
      {
        name: 'Chicken Seekh Kebab',
        description:
          'Minced chicken skewers with ginger, green chilli, and garam masala, served with mint chutney.',
        price: 320,
        imageUrl: IMAGE.kebab,
        ingredients: ['chicken', 'onion', 'ginger', 'green chilli', 'garam masala'],
        dietaryTags: ['non-vegetarian', 'gluten-free'],
      },
      {
        name: 'Vegetable Samosa (2 pcs)',
        description:
          'Golden pastry parcels stuffed with spiced potato and peas, with tamarind and green chutney.',
        price: 160,
        imageUrl: IMAGE.samosa,
        ingredients: ['potato', 'peas', 'cumin', 'wheat flour', 'tamarind'],
        dietaryTags: ['vegetarian', 'vegan'],
      },
      {
        name: 'Tomato Shorba',
        description:
          'Silky roasted tomato broth tempered with cumin and a hint of black pepper.',
        price: 180,
        imageUrl: IMAGE.soup,
        ingredients: ['tomato', 'cumin', 'garlic', 'black pepper', 'coriander'],
        dietaryTags: ['vegetarian', 'vegan', 'gluten-free'],
      },
      {
        name: 'Hara Bhara Kebab',
        description:
          'Spinach and green pea patties with crushed cashew, pan-seared until crisp outside.',
        price: 240,
        imageUrl: IMAGE.salad,
        ingredients: ['spinach', 'peas', 'potato', 'cashew', 'chaat masala'],
        dietaryTags: ['vegetarian', 'contains-nuts'],
      },
      {
        name: 'Fish Amritsari',
        description:
          'River fish fillets in a gram-flour batter with ajwain, fried and served with onion salad.',
        price: 380,
        imageUrl: IMAGE.kebab,
        ingredients: ['fish', 'besan', 'ajwain', 'red chilli', 'lemon'],
        dietaryTags: ['non-vegetarian', 'gluten-free'],
      },
      {
        name: 'Dahi Ke Kebab',
        description:
          'Soft hung-curd kebabs crusted lightly and served with roasted tomato chutney.',
        price: 260,
        imageUrl: IMAGE.paneerTikka,
        ingredients: ['hung curd', 'paneer', 'cornflour', 'cardamom', 'tomato'],
        dietaryTags: ['vegetarian', 'contains-dairy'],
      },
    ],
  },
  {
    name: 'Main Course',
    description: 'Curries and classics meant to be shared with bread or rice.',
    displayOrder: 2,
    dishes: [
      {
        name: 'Butter Chicken',
        description:
          'Tandoori chicken simmered in a tomato-butter gravy with fenugreek and cream.',
        price: 420,
        imageUrl: IMAGE.butterChicken,
        ingredients: ['chicken', 'tomato', 'butter', 'cream', 'kasuri methi'],
        dietaryTags: ['non-vegetarian', 'contains-dairy', 'signature'],
      },
      {
        name: 'Dal Makhani',
        description:
          'Black lentils and kidney beans slow-cooked overnight with butter and cream.',
        price: 280,
        imageUrl: IMAGE.dal,
        ingredients: ['black lentil', 'rajma', 'butter', 'cream', 'ginger'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'gluten-free'],
      },
      {
        name: 'Palak Paneer',
        description:
          'Fresh spinach puree with soft paneer cubes, tempered with garlic and cumin.',
        price: 300,
        imageUrl: IMAGE.palak,
        ingredients: ['spinach', 'paneer', 'garlic', 'cumin', 'cream'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'gluten-free'],
      },
      {
        name: 'Rogan Josh',
        description:
          'Kashmiri-style lamb curry with fennel, dried ginger, and a deep red gravy.',
        price: 480,
        imageUrl: IMAGE.curry,
        ingredients: ['lamb', 'yogurt', 'fennel', 'Kashmiri chilli', 'ginger'],
        dietaryTags: ['non-vegetarian', 'contains-dairy', 'gluten-free'],
      },
      {
        name: 'Kadai Paneer',
        description:
          'Paneer and capsicum tossed in a coarse kadai masala with crushed coriander.',
        price: 320,
        imageUrl: IMAGE.paneerTikka,
        ingredients: ['paneer', 'capsicum', 'onion', 'tomato', 'coriander seeds'],
        dietaryTags: ['vegetarian', 'contains-dairy'],
      },
      {
        name: 'Chicken Chettinad',
        description:
          'Fiery South Indian chicken curry with roasted spices, curry leaf, and coconut.',
        price: 400,
        imageUrl: IMAGE.curry,
        ingredients: ['chicken', 'coconut', 'curry leaf', 'star anise', 'black pepper'],
        dietaryTags: ['non-vegetarian', 'spicy', 'gluten-free'],
      },
      {
        name: 'Malabar Fish Curry',
        description:
          'Coastal fish curry with kokum, coconut milk, and tempered mustard seeds.',
        price: 450,
        imageUrl: IMAGE.curry,
        ingredients: ['fish', 'coconut milk', 'kokum', 'mustard seed', 'curry leaf'],
        dietaryTags: ['non-vegetarian', 'gluten-free', 'contains-seafood'],
      },
      {
        name: 'Garlic Naan',
        description: 'Clay-oven flatbread brushed with garlic butter and coriander.',
        price: 90,
        imageUrl: IMAGE.naan,
        ingredients: ['wheat flour', 'yeast', 'garlic', 'butter', 'coriander'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-gluten'],
      },
    ],
  },
  {
    name: 'Biryani',
    description: 'Layered rice pots — the dishes guests linger on longest.',
    displayOrder: 3,
    dishes: [
      {
        name: 'Chicken Biryani',
        description:
          'Hyderabadi-style dum biryani with basmati, saffron, fried onions, and bone-in chicken.',
        price: 380,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'chicken', 'saffron', 'fried onion', 'yogurt'],
        dietaryTags: ['non-vegetarian', 'signature', 'contains-dairy'],
      },
      {
        name: 'Mutton Biryani',
        description:
          'Slow-cooked mutton layered with fragrant rice, whole spices, and a sealed dum finish.',
        price: 450,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'mutton', 'saffron', 'mint', 'ghee'],
        dietaryTags: ['non-vegetarian', 'contains-dairy'],
      },
      {
        name: 'Vegetable Dum Biryani',
        description:
          'Seasonal vegetables and paneer nestled in saffron rice with rose water aroma.',
        price: 320,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'paneer', 'carrot', 'beans', 'saffron'],
        dietaryTags: ['vegetarian', 'contains-dairy'],
      },
      {
        name: 'Egg Biryani',
        description:
          'Boiled eggs simmered in spice masala, layered with basmati and caramelised onion.',
        price: 300,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'egg', 'onion', 'tomato', 'biryani masala'],
        dietaryTags: ['non-vegetarian', 'contains-egg'],
      },
      {
        name: 'Prawn Biryani',
        description:
          'Coastal prawns marinated in chilli and turmeric, dum-cooked with lemon rice notes.',
        price: 480,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'prawn', 'turmeric', 'coconut', 'curry leaf'],
        dietaryTags: ['non-vegetarian', 'contains-seafood', 'spicy'],
      },
      {
        name: 'Lucknowi Chicken Biryani',
        description:
          'Awadhi-style lighter spice profile with kewra, saffron milk, and tender chicken.',
        price: 400,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'chicken', 'kewra', 'saffron', 'ghee'],
        dietaryTags: ['non-vegetarian', 'contains-dairy', 'mild'],
      },
      {
        name: 'Paneer Tikka Biryani',
        description:
          'Charred paneer tikka folded into biryani rice with mint raita on the side.',
        price: 350,
        imageUrl: IMAGE.biryani,
        ingredients: ['basmati rice', 'paneer', 'mint', 'yogurt', 'bell pepper'],
        dietaryTags: ['vegetarian', 'contains-dairy'],
      },
    ],
  },
  {
    name: 'Desserts',
    description: 'A sweet close — warm, chilled, or celebratory.',
    displayOrder: 4,
    dishes: [
      {
        name: 'Gulab Jamun (2 pcs)',
        description: 'Soft milk dumplings soaked in cardamom syrup, served warm.',
        price: 140,
        imageUrl: IMAGE.gulab,
        ingredients: ['khoya', 'flour', 'cardamom', 'sugar syrup', 'rose water'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-gluten'],
      },
      {
        name: 'Rasmalai (2 pcs)',
        description: 'Poached chenna discs in chilled saffron milk with pistachio.',
        price: 160,
        imageUrl: IMAGE.dessert,
        ingredients: ['chenna', 'milk', 'saffron', 'pistachio', 'cardamom'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-nuts'],
      },
      {
        name: 'Gajar Halwa',
        description: 'Slow-reduced winter carrot pudding with ghee, khoya, and almonds.',
        price: 180,
        imageUrl: IMAGE.dessert,
        ingredients: ['carrot', 'milk', 'ghee', 'khoya', 'almond'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-nuts'],
      },
      {
        name: 'Chocolate Sizzler Brownie',
        description: 'Warm brownie on a sizzler plate with vanilla ice cream and chocolate sauce.',
        price: 220,
        imageUrl: IMAGE.dessert,
        ingredients: ['chocolate', 'flour', 'butter', 'ice cream', 'walnut'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-gluten', 'contains-nuts'],
      },
      {
        name: 'Kulfi Falooda',
        description: 'Malai kulfi with vermicelli, rose syrup, basil seeds, and chilled milk.',
        price: 190,
        imageUrl: IMAGE.lassi,
        ingredients: ['kulfi', 'falooda', 'rose syrup', 'milk', 'sabja'],
        dietaryTags: ['vegetarian', 'contains-dairy'],
      },
      {
        name: 'Shahi Tukda',
        description: 'Fried bread soaked in rabri, finished with silver leaf and nuts.',
        price: 170,
        imageUrl: IMAGE.dessert,
        ingredients: ['bread', 'milk', 'saffron', 'pistachio', 'almond'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'contains-gluten', 'contains-nuts'],
      },
    ],
  },
  {
    name: 'Beverages',
    description: 'Coolers, chai, and classics to pair with the meal.',
    displayOrder: 5,
    dishes: [
      {
        name: 'Masala Chai',
        description: 'Assam tea brewed with ginger, cardamom, and a touch of pepper.',
        price: 80,
        imageUrl: IMAGE.chai,
        ingredients: ['tea', 'milk', 'ginger', 'cardamom', 'pepper'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'hot'],
      },
      {
        name: 'Sweet Lassi',
        description: 'Chilled whipped yogurt sweetened lightly with cardamom.',
        price: 120,
        imageUrl: IMAGE.lassi,
        ingredients: ['yogurt', 'sugar', 'cardamom', 'ice'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'cold'],
      },
      {
        name: 'Mango Lassi',
        description: 'Alphonso mango pulp blended with yogurt until frothy and cold.',
        price: 150,
        imageUrl: IMAGE.lassi,
        ingredients: ['mango', 'yogurt', 'sugar', 'cardamom'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'cold'],
      },
      {
        name: 'Fresh Lime Soda',
        description: 'House soda with fresh lime — choose sweet, salted, or mixed.',
        price: 100,
        imageUrl: IMAGE.beverage,
        ingredients: ['lime', 'soda', 'sugar', 'black salt'],
        dietaryTags: ['vegetarian', 'vegan', 'cold'],
      },
      {
        name: 'Filter Coffee',
        description: 'South Indian filter coffee decoction mixed with hot frothed milk.',
        price: 110,
        imageUrl: IMAGE.chai,
        ingredients: ['coffee', 'milk', 'sugar'],
        dietaryTags: ['vegetarian', 'contains-dairy', 'hot'],
      },
      {
        name: 'Watermelon Cooler',
        description: 'Fresh watermelon juice with mint and a squeeze of lime.',
        price: 140,
        imageUrl: IMAGE.beverage,
        ingredients: ['watermelon', 'mint', 'lime', 'ice'],
        dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'cold'],
      },
      {
        name: 'Jaljeera',
        description: 'Tangy cumin cooler with mint, black salt, and a hint of chilli.',
        price: 90,
        imageUrl: IMAGE.beverage,
        ingredients: ['cumin', 'mint', 'black salt', 'lemon', 'chaat masala'],
        dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'cold'],
      },
    ],
  },
];

async function main() {
  console.log('Seeding demo restaurant…');

  await prisma.analyticsEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.restaurant.deleteMany();

  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Saffron Court',
      slug: 'saffron-court',
      description:
        'A contemporary Indian dining room in Pune — charcoal starters, slow curries, and dum biryanis crafted for unhurried evenings.',
      email: 'hello@saffroncourt.local',
      phone: '+91 20 1234 5678',
      address: 'Koregaon Park, Pune',
      logoUrl: IMAGE.logo,
      status: 'ACTIVE',
      menus: {
        create: {
          name: 'Dinner Menu',
          description: 'Evening à la carte — starters through beverages.',
          isPublished: true,
          categories: {
            create: categories.map((category) => ({
              name: category.name,
              description: category.description,
              displayOrder: category.displayOrder,
              dishes: {
                create: category.dishes.map((dish, index) => ({
                  name: dish.name,
                  description: dish.description,
                  price: dish.price,
                  imageUrl: dish.imageUrl,
                  ingredients: dish.ingredients,
                  dietaryTags: dish.dietaryTags,
                  displayOrder: index + 1,
                  isAvailable: true,
                })),
              },
            })),
          },
        },
      },
    },
    include: {
      menus: {
        include: {
          categories: {
            include: {
              dishes: true,
            },
          },
        },
      },
    },
  });

  const menu = restaurant.menus[0];
  const categoryCount = menu.categories.length;
  const dishCount = menu.categories.reduce((sum, c) => sum + c.dishes.length, 0);

  const superHash = await bcrypt.hash(DEMO_ACCOUNTS.superAdmin.password, 10);
  const adminHash = await bcrypt.hash(DEMO_ACCOUNTS.restaurantAdmin.password, 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: DEMO_ACCOUNTS.superAdmin.name,
      email: DEMO_ACCOUNTS.superAdmin.email,
      passwordHash: superHash,
      role: DEMO_ACCOUNTS.superAdmin.role,
      restaurantId: null,
      isActive: true,
    },
  });

  const restaurantAdmin = await prisma.user.create({
    data: {
      name: DEMO_ACCOUNTS.restaurantAdmin.name,
      email: DEMO_ACCOUNTS.restaurantAdmin.email,
      passwordHash: adminHash,
      role: DEMO_ACCOUNTS.restaurantAdmin.role,
      restaurantId: restaurant.id,
      isActive: true,
    },
  });

  console.log(`Restaurant: ${restaurant.name} (${restaurant.slug})`);
  console.log(`Menu: ${menu.name} (published=${menu.isPublished})`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Dishes: ${dishCount}`);
  for (const category of menu.categories.sort((a, b) => a.displayOrder - b.displayOrder)) {
    console.log(`  - ${category.name}: ${category.dishes.length} dishes`);
  }
  console.log('Demo users:');
  console.log(`  SUPER_ADMIN: ${superAdmin.email}`);
  console.log(`  RESTAURANT_ADMIN: ${restaurantAdmin.email} → ${restaurant.slug}`);
  console.log('Passwords are documented in docs/AUTH.md (local development only).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
