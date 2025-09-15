import type { Server } from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { organization, server } from "@dokploy/server/db/schema";
import { asc, eq } from "drizzle-orm";

const activateServer = async (serverId: string) => {
  await db
    .update(server)
    .set({ serverStatus: "active" })
    .where(eq(server.serverId, serverId));
};

const deactivateServer = async (serverId: string) => {
  await db
    .update(server)
    .set({ serverStatus: "inactive" })
    .where(eq(server.serverId, serverId));
};

const findServersByUserIdSorted = async (userId: string) => {
  const organizations = await db.query.organization.findMany({
    where: eq(organization.ownerId, userId),
  });

  const servers: Server[] = [];
  for (const org of organizations) {
    const serversByOrg = await db.query.server.findMany({
      where: eq(server.organizationId, org.id),
      orderBy: asc(server.createdAt),
    });
    servers.push(...serversByOrg);
  }

  return servers;
};

export const updateServersBasedOnQuantity = async (
  userId: string,
  newServersQuantity: number
) => {
  const servers = await findServersByUserIdSorted(userId);

  if (servers.length > newServersQuantity) {
    for (const [index, server] of servers.entries()) {
      if (index < newServersQuantity) {
        await activateServer(server.serverId);
      } else {
        await deactivateServer(server.serverId);
      }
    }
  } else {
    for (const server of servers) {
      await activateServer(server.serverId);
    }
  }
};

