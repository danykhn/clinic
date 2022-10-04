import { PrismaClient, UserType } from '@prisma/client';
import { genSaltSync, hashSync } from 'bcrypt';
import { Permissions } from '../src/common/permissions.constant';
import { afiliados } from '../src/data/afiliados';
import * as moment from 'moment';
const prisma = new PrismaClient();

function generateRandomInt(min, max) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}

async function generateName(quantity: number) {
  var first_name = [
    'Gonzalo',
    'Sergio',
    'Ale',
    'Juan',
    'Pablo',
    'Andres',
    'Martin',
    'Lucas',
    'Nicolas',
    'Matias',
    'Agostina',
    'Bianca',
    'Adrina',
    'Ariel',
    'Cristian',
  ];

  var last_name = [
    'Iniguez',
    'Mauri',
    'Basabe',
    'Sosa',
    'Carrara',
    'Fernandez',
    'Gonsalez',
    'Pedreti',
    'Tarantino',
    'Bottini',
    'Lapertosa',
    'Saraseni',
  ];

  const array = [];
  for (let i = 0; i < quantity; i++) {
    const firstName = first_name[generateRandomInt(0, first_name.length)];
    const lastName = last_name[generateRandomInt(0, last_name.length)];

    array.push({
      firstName,
      lastName,
      userType: UserType.Affiliate,
    });
  }

  return array;
}

async function AdminSeed() {
  for await (const permission of Permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      create: { name: permission.name, description: permission.description },
      update: { name: permission.name, description: permission.description },
    });
  }

  const SuperAdminRol = await prisma.rol.upsert({
    where: { name: 'SuperAdmin Rol' },
    create: {
      name: 'SuperAdmin Rol',
      permissions: { connect: Permissions.map((e) => ({ name: e.name })) },
    },
    update: {
      permissions: { connect: Permissions.map((e) => ({ name: e.name })) },
    },
  });

  const SuperAdmin = await prisma.user.upsert({
    where: { username: 'SuperAdmin' },
    update: {
      roles: {
        connect: { name: 'SuperAdmin Rol' },
      },
    },
    create: {
      username: 'SuperAdmin',
      password: hashSync('123', genSaltSync()),
      userType: 'Admin',
      roles: {
        connect: { name: 'SuperAdmin Rol' },
      },
    },
  });
  console.log({ SuperAdmin });
}

async function DataGenerate() {
  for (const af of afiliados) {
    const members = [];

    if (af.PERSONA1) members.push(af.PERSONA1);
    if (af.PERSONA2) members.push(af.PERSONA2);
    if (af.PERSONA3) members.push(af.PERSONA3);
    if (af.PERSONA4) members.push(af.PERSONA4);
    if (af.PERSONA5) members.push(af.PERSONA5);
    if (af.PERSONA6) members.push(af.PERSONA6);
    if (af.PERSONA7) members.push(af.PERSONA7);
    if (af.PERSONA8) members.push(af.PERSONA8);
    if (af.PERSONA9) members.push(af.PERSONA9);

    const familiarGroup = await prisma.familiarGroup.create({ data: {} });

    const holder = await prisma.user.create({
      data: {
        userType: 'Affiliate',
        ...(af.DNI && { dni: af.DNI }),
        ...(af.PERSONA && { firstName: af.PERSONA }),
        ...(af['FECHA DE AFILIACION'] && { inscriptionDate: new Date(af['FECHA DE AFILIACION']) }),
        ...(af.NACIMIENTO && { bornDate: new Date(af.NACIMIENTO) }),
        ...(af.DOMICILIO && { address: af.DOMICILIO }),
        ...(af.TELEFONO && { phone: af.TELEFONO }),
        familiarMember: { create: { familiarGroupId: familiarGroup.id, isHolder: true } },
      },
    });

    if (holder.inscriptionDate) {
      for (
        var inscriptionDate = moment(holder.inscriptionDate, 'DD/MM/YYYY');
        inscriptionDate.isBefore(moment());
        inscriptionDate.add(1, 'M')
      ) {
        console.log(inscriptionDate.format('DD/MM/YYYY'));
        console.log('MONTH NUMBER', inscriptionDate.format('M'));
        console.log('YEAR NUMBER', inscriptionDate.format('YYYY'));
        await prisma.payment.create({
          data: {
            familiarGroupId: familiarGroup.id,
            userId: holder.id,
            month: +inscriptionDate.format('M'),
            year: +inscriptionDate.format('YYYY'),
            amount: 0,
            total: 0,
            status: 'Paid',
            type: 'Cash',
          },
        });
      }
    }

    for (const mem of members) {
      await prisma.user.create({
        data: {
          userType: 'Affiliate',
          firstName: mem,
          ...(af['FECHA DE AFILIACION'] && { inscriptionDate: new Date(af['FECHA DE AFILIACION']) }),
          familiarMember: { create: { familiarGroupId: familiarGroup.id, isHolder: false } },
        },
      });
    }
  }
}

async function main() {
  // const affiliatesArray = await generateName(1500);
  // const affiliates = await prisma.user.createMany({
  //   data: affiliatesArray,
  // });
  await AdminSeed();
  await DataGenerate();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
