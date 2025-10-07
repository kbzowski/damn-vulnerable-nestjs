import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with vulnerable data...');

  // Create users with weak passwords (plain text for vulnerability)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shop.com' },
    update: {},
    create: {
      email: 'admin@shop.com',
      username: 'admin',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      username: 'john',
      password: '123456',
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Main St, City, State',
      phone: '555-0123',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      username: 'jane',
      password: 'qwerty',
      firstName: 'Jane',
      lastName: 'Smith',
      address: '456 Oak Ave, Town, State',
      phone: '555-0456',
    },
  });

  // Create some test users with common weak passwords
  const weakPasswords = ['password', '12345', 'admin', 'letmein', 'welcome'];
  for (let i = 0; i < weakPasswords.length; i++) {
    await prisma.user.upsert({
      where: { email: `user${i + 3}@example.com` },
      update: {},
      create: {
        email: `user${i + 3}@example.com`,
        username: `user${i + 3}`,
        password: weakPasswords[i],
        firstName: `User`,
        lastName: `${i + 3}`,
      },
    });
  }

  // Create products
  const products = [
    {
      name: 'Laptop Pro',
      description: 'High-performance laptop for professionals',
      price: 1299.99,
      stock: 50,
      category: 'Electronics',
      imageUrl: '/uploads/laptop.jpg',
    },
    {
      name: 'Smartphone X',
      description: 'Latest smartphone with advanced features',
      price: 899.99,
      stock: 100,
      category: 'Electronics',
      imageUrl: '/uploads/phone.jpg',
    },
    {
      name: 'Gaming Mouse',
      description: 'Precision gaming mouse with RGB lighting',
      price: 79.99,
      stock: 200,
      category: 'Gaming',
      imageUrl: '/uploads/mouse.jpg',
    },
    {
      name: 'Mechanical Keyboard',
      description: 'Premium mechanical keyboard for gaming and typing',
      price: 149.99,
      stock: 75,
      category: 'Gaming',
      imageUrl: '/uploads/keyboard.jpg',
    },
    {
      name: 'Wireless Headphones',
      description: 'Noise-cancelling wireless headphones',
      price: 199.99,
      stock: 120,
      category: 'Audio',
      imageUrl: '/uploads/headphones.jpg',
    },
    {
      name: 'Coffee Maker',
      description: 'Programmable coffee maker with timer',
      price: 89.99,
      stock: 30,
      category: 'Home',
      imageUrl: '/uploads/coffee.jpg',
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  // Create some sample orders
  const createdProducts = await prisma.product.findMany();
  
  await prisma.order.create({
    data: {
      userId: user1.id,
      totalAmount: 1379.98,
      status: 'paid',
      shippingAddress: '123 Main St, City, State',
      items: {
        create: [
          {
            productId: createdProducts[0].id, // Laptop
            quantity: 1,
            price: 1299.99,
          },
          {
            productId: createdProducts[2].id, // Gaming Mouse
            quantity: 1,
            price: 79.99,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: user2.id,
      totalAmount: 349.98,
      status: 'pending',
      shippingAddress: '456 Oak Ave, Town, State',
      items: {
        create: [
          {
            productId: createdProducts[3].id, // Keyboard
            quantity: 1,
            price: 149.99,
          },
          {
            productId: createdProducts[4].id, // Headphones
            quantity: 1,
            price: 199.99,
          },
        ],
      },
    },
  });

  console.log('Database seeded successfully!');
  console.log('Vulnerable accounts created:');
  console.log('- admin@shop.com / password123 (Admin)');
  console.log('- john@example.com / 123456');
  console.log('- jane@example.com / qwerty');
  console.log('- Additional users with weak passwords: password, 12345, admin, letmein, welcome');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });