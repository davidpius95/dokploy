import path from "path";

export const IS_CLOUD = process.env.IS_CLOUD === "true";
export const STRIPE_ENABLED = process.env.STRIPE_ENABLED !== "false"; // Default to true unless explicitly set to false
export const PAYSTACK_ENABLED = process.env.PAYSTACK_ENABLED === "true";

export const paths = (isServer = false) => {
  const BASE_PATH =
    isServer || process.env.NODE_ENV === "production"
      ? "/etc/dokploy"
      : path.join(process.cwd(), ".docker");
  const MAIN_TRAEFIK_PATH = `${BASE_PATH}/traefik`;
  const DYNAMIC_TRAEFIK_PATH = `${MAIN_TRAEFIK_PATH}/dynamic`;

  return {
    BASE_PATH,
    MAIN_TRAEFIK_PATH,
    DYNAMIC_TRAEFIK_PATH,
    LOGS_PATH: `${BASE_PATH}/logs`,
    APPLICATIONS_PATH: `${BASE_PATH}/applications`,
    COMPOSE_PATH: `${BASE_PATH}/compose`,
    SSH_PATH: `${BASE_PATH}/ssh`,
    CERTIFICATES_PATH: `${DYNAMIC_TRAEFIK_PATH}/certificates`,
    MONITORING_PATH: `${BASE_PATH}/monitoring`,
    REGISTRY_PATH: `${BASE_PATH}/registry`,
    SCHEDULES_PATH: `${BASE_PATH}/schedules`,
    VOLUME_BACKUPS_PATH: `${BASE_PATH}/volume-backups`,
  };
};
