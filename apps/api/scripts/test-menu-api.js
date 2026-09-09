async function request(path) {
  const response = await fetch(`http://localhost:4000${path}`);
  const body = await response.json();
  return { status: response.status, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('1) GET restaurant by slug');
  const restaurant = await request('/api/restaurants/saffron-court');
  assert(restaurant.status === 200, `expected 200, got ${restaurant.status}`);
  assert(restaurant.body.restaurant?.name === 'Saffron Court', 'restaurant name mismatch');
  assert(restaurant.body.restaurant?.logo, 'logo missing');
  console.log('   OK', restaurant.body.restaurant.name);

  console.log('2) GET published menu');
  const menu = await request('/api/restaurants/saffron-court/menu');
  assert(menu.status === 200, `expected 200, got ${menu.status}`);
  assert(menu.body.restaurant?.name === 'Saffron Court', 'menu restaurant name mismatch');
  assert(Array.isArray(menu.body.menu?.categories), 'categories missing');
  assert(menu.body.menu.categories.length === 5, `expected 5 categories, got ${menu.body.menu.categories.length}`);

  const dishCount = menu.body.menu.categories.reduce((sum, c) => sum + c.dishes.length, 0);
  assert(dishCount === 35, `expected 35 dishes, got ${dishCount}`);
  assert(typeof menu.body.menu.categories[0].dishes[0].price === 'number', 'price should be number');
  console.log(
    '   OK',
    menu.body.menu.categories.map((c) => `${c.name}:${c.dishes.length}`).join(', '),
  );

  console.log('3) restaurant not found');
  const missing = await request('/api/restaurants/does-not-exist');
  assert(missing.status === 404, `expected 404, got ${missing.status}`);
  console.log('   OK', missing.body.message);

  console.log('4) invalid slug');
  const invalid = await request('/api/restaurants/INVALID_SLUG!');
  assert(invalid.status === 400, `expected 400, got ${invalid.status}`);
  console.log('   OK', invalid.body.message);

  console.log('5) unpublished menu');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.menu.updateMany({
    where: { restaurant: { slug: 'saffron-court' } },
    data: { isPublished: false },
  });

  const unpublished = await request('/api/restaurants/saffron-court/menu');
  assert(unpublished.status === 404, `expected 404 for unpublished, got ${unpublished.status}`);
  console.log('   OK', unpublished.body.message);

  await prisma.menu.updateMany({
    where: { restaurant: { slug: 'saffron-court' } },
    data: { isPublished: true },
  });
  await prisma.$disconnect();

  const restored = await request('/api/restaurants/saffron-court/menu');
  assert(restored.status === 200, 'failed to restore published menu');
  console.log('   restored published menu');

  console.log('\nAll menu API tests passed.');
}

main().catch((error) => {
  console.error('\nTEST FAILED:', error.message);
  process.exit(1);
});
