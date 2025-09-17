import path from "node:path";
import { BRAND_NAME, paths } from "@guildserver/server/constants";
import {
	createServerDeployment,
	updateDeploymentStatus,
} from "@guildserver/server/services/deployment";
import { findServerById } from "@guildserver/server/services/server";
import {
	getDefaultMiddlewares,
	getDefaultServerTraefikConfig,
	TRAEFIK_HTTP3_PORT,
	TRAEFIK_PORT,
	TRAEFIK_SSL_PORT,
	TRAEFIK_VERSION,
} from "@guildserver/server/setup/traefik-setup";
import slug from "slugify";
import { Client } from "ssh2";
import { recreateDirectory } from "../utils/filesystem/directory";

export const slugify = (text: string | undefined) => {
	if (!text) {
		return "";
	}

	const cleanedText = text.trim().replace(/[^a-zA-Z0-9\s]/g, "");

	return slug(cleanedText, {
		lower: true,
		trim: true,
		strict: true,
	});
};

export const serverSetup = async (
	serverId: string,
	onData?: (data: any) => void,
) => {
	const server = await findServerById(serverId);
	const { LOGS_PATH } = paths();

	const slugifyName = slugify(`server ${server.name}`);

	const fullPath = path.join(LOGS_PATH, slugifyName);

	await recreateDirectory(fullPath);

	const deployment = await createServerDeployment({
		serverId: server.serverId,
		title: "Setup Server",
		description: "Setup Server",
	});

	try {
		onData?.("\nInstalling Server Dependencies: ✅\n");
		await installRequirements(serverId, onData);

		await updateDeploymentStatus(deployment.deploymentId, "done");

		onData?.("\nSetup Server: ✅\n");
	} catch (err) {
		console.log(err);

		await updateDeploymentStatus(deployment.deploymentId, "error");
		onData?.(`${err} ❌\n`);
	}
};

export const defaultCommand = () => {
	const scriptBody = `
set -e;
DOCKER_VERSION=27.0.3
OS_TYPE=$(grep -w "ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
SYS_ARCH=$(uname -m)
ORIGINAL_USER=\${ORIGINAL_USER:-\${SUDO_USER:-$USER}}
TARGET_USER="$ORIGINAL_USER"

timestamp() {
	date -u '+%Y-%m-%d %H:%M:%S UTC'
}

log_step() {
	printf '\n[%s] %s\n' "$(timestamp)" "$1"
}

log_substep() {
	printf '  - %s\n' "$1"
}

log_step "Installing requirements for OS: $OS_TYPE"

# Check if the OS is manjaro, if so, change it to arch
if [ "$OS_TYPE" = "manjaro" ] || [ "$OS_TYPE" = "manjaro-arm" ]; then
	OS_TYPE="arch"
fi

# Check if the OS is Asahi Linux, if so, change it to fedora
if [ "$OS_TYPE" = "fedora-asahi-remix" ]; then
	OS_TYPE="fedora"
fi

# Check if the OS is popOS, if so, change it to ubuntu
if [ "$OS_TYPE" = "pop" ]; then
	OS_TYPE="ubuntu"
fi

# Check if the OS is linuxmint, if so, change it to ubuntu
if [ "$OS_TYPE" = "linuxmint" ]; then
	OS_TYPE="ubuntu"
fi

#Check if the OS is zorin, if so, change it to ubuntu
if [ "$OS_TYPE" = "zorin" ]; then
	OS_TYPE="ubuntu"
fi

if [ "$OS_TYPE" = "arch" ] || [ "$OS_TYPE" = "archarm" ]; then
	OS_VERSION="rolling"
else
	OS_VERSION=$(grep -w "VERSION_ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
fi

if [ "$OS_TYPE" = 'amzn' ]; then
    dnf install -y findutils >/dev/null
fi

case "$OS_TYPE" in
arch | ubuntu | debian | raspbian | centos | fedora | rhel | ol | rocky | sles | opensuse-leap | opensuse-tumbleweed | almalinux | opencloudos | amzn | alpine) ;;
*)
	echo "This script only supports Debian, Redhat, Arch Linux, Alpine Linux, or SLES based operating systems for now."
	exit
	;;
esac

log_step "Environment summary"
log_substep "CPU Architecture: $SYS_ARCH"
log_substep "Operating System: $OS_TYPE $OS_VERSION"
log_substep "Docker Version Target: $DOCKER_VERSION"

log_step "1. Installing required packages (curl, wget, git, jq, openssl)"

command_exists() {
	command -v "$@" > /dev/null 2>&1
}

${installUtilities()}

log_step "2. Validating ports"
${validatePorts()}



log_step "3. Installing RClone"
${installRClone()}

log_step "4. Installing Docker"
${installDocker()}

log_step "5. Setting up Docker Swarm"
${setupSwarm()}

log_step "6. Setting up Docker network"
${setupNetwork()}

log_step "7. Setting up directories"
${setupMainDirectory()}
${setupDirectories()}

log_step "8. Configuring Traefik"
${createTraefikConfig()}

log_step "9. Configuring Traefik middlewares"
${createDefaultMiddlewares()}

log_step "10. Deploying Traefik instance"
${createTraefikInstance()}

log_step "11. Installing Nixpacks"
${installNixpacks()}

log_step "12. Installing Buildpacks"
${installBuildpacks()}

log_step "13. Installing Railpack"
${installRailpack()}

log_step "GuildServer dependencies installation completed"
				`;

	const rootWrapper = `
ORIGINAL_USER=\${ORIGINAL_USER:-\${SUDO_USER:-$USER}}
export ORIGINAL_USER
if [ "$EUID" != 0 ]; then
	if command -v sudo >/dev/null 2>&1; then
		echo "Re-running script with sudo..."
		sudo -E bash <<'GUILDSETUP'
${scriptBody}
GUILDSETUP
		exit $?
	else
		echo "This script must be run as root or with sudo."
		exit 1
	fi
fi
`;

	return `${rootWrapper}
${scriptBody}`;
};

const installRequirements = async (
	serverId: string,
	onData?: (data: any) => void,
) => {
	const client = new Client();
	const server = await findServerById(serverId);
	if (!server.sshKeyId) {
		onData?.("❌ No SSH Key found, please assign one to this server");
		throw new Error("No SSH Key found");
	}

	return new Promise<void>((resolve, reject) => {
		client
			.once("ready", () => {
				const command = server.command || defaultCommand();
				client.exec(command, (err, stream) => {
					if (err) {
						onData?.(err.message);
						reject(err);
						return;
					}
					stream
						.on("close", () => {
							client.end();
							resolve();
						})
						.on("data", (data: string) => {
							onData?.(data.toString());
						})
						.stderr.on("data", (data) => {
							onData?.(data.toString());
						});
				});
			})
			.on("error", (err) => {
				client.end();
				if (err.level === "client-authentication") {
					onData?.(
						`Authentication failed: Invalid SSH private key. ❌ Error: ${err.message} ${err.level}`,
					);
					reject(
						new Error(
							`Authentication failed: Invalid SSH private key. ❌ Error: ${err.message} ${err.level}`,
						),
					);
				} else {
					onData?.(`SSH connection error: ${err.message} ${err.level}`);
					reject(new Error(`SSH connection error: ${err.message}`));
				}
			})
			.connect({
				host: server.ipAddress,
				port: server.port,
				username: server.username,
				privateKey: server.sshKey?.privateKey,
			});
	});
};

const setupDirectories = () => {
	const { SSH_PATH } = paths(true);
	const directories = Object.values(paths(true));

	const createDirsCommand = directories
		.map(
			(dir) =>
				`mkdir -p "${dir}"\nchown -R "$TARGET_USER:$TARGET_USER" "${dir}"`,
		)
		.join("\n");
	const chmodCommand = `chmod 700 "${SSH_PATH}"`;

	const command = `
	${createDirsCommand}
	${chmodCommand}
	`;

	return command;
};

const setupMainDirectory = () => `
	BASE_DIR="/etc/guildserver"
	if [ -d "$BASE_DIR" ]; then
		echo "$BASE_DIR already exists ✅"
	else
		mkdir -p "$BASE_DIR"
		echo "Directory $BASE_DIR created ✅"
	fi
	chown -R "$TARGET_USER:$TARGET_USER" "$BASE_DIR"
	chmod 755 "$BASE_DIR"
	mkdir -p "$BASE_DIR/traefik/dynamic"
	chown -R "$TARGET_USER:$TARGET_USER" "$BASE_DIR/traefik"
	chmod -R 755 "$BASE_DIR/traefik"
`;

export const setupSwarm = () => `
		# Check if the node is already part of a Docker Swarm
		if docker info | grep -q 'Swarm: active'; then
			echo "Already part of a Docker Swarm ✅"
		else
			# Get IP address
			get_ip() {
				local ip=""

				# Try IPv4 with multiple services
				# First attempt: ifconfig.io
				ip=\$(curl -4s --connect-timeout 5 https://ifconfig.io 2>/dev/null)

				# Second attempt: icanhazip.com
				if [ -z "\$ip" ]; then
					ip=\$(curl -4s --connect-timeout 5 https://icanhazip.com 2>/dev/null)
				fi

				# Third attempt: ipecho.net
				if [ -z "\$ip" ]; then
					ip=\$(curl -4s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null)
				fi

				# If no IPv4, try IPv6 with multiple services
				if [ -z "\$ip" ]; then
					# Try IPv6 with ifconfig.io
					ip=\$(curl -6s --connect-timeout 5 https://ifconfig.io 2>/dev/null)

					# Try IPv6 with icanhazip.com
					if [ -z "\$ip" ]; then
						ip=\$(curl -6s --connect-timeout 5 https://icanhazip.com 2>/dev/null)
					fi

					# Try IPv6 with ipecho.net
					if [ -z "\$ip" ]; then
						ip=\$(curl -6s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null)
					fi
				fi

				if [ -z "\$ip" ]; then
					echo "Error: Could not determine server IP address automatically (neither IPv4 nor IPv6)." >&2
					echo "Please set the ADVERTISE_ADDR environment variable manually." >&2
					echo "Example: export ADVERTISE_ADDR=<your-server-ip>" >&2
					exit 1
				fi

				echo "\$ip"
			}
			advertise_addr=\$(get_ip)
			echo "Advertise address: \$advertise_addr"

			# Initialize Docker Swarm
			docker swarm init --advertise-addr \$advertise_addr
			echo "Swarm initialized ✅"
		fi
	`;

const setupNetwork = () => `
	# Check if the guildserver-network already exists
	if docker network ls | grep -q 'guildserver-network'; then
		echo "Network guildserver-network already exists ✅"
	else
		# Create the guildserver-network if it doesn't exist
		if docker network create --driver overlay --attachable guildserver-network; then
			echo "Network created ✅"
		else
			echo "Failed to create guildserver-network ❌" >&2
			exit 1
		fi
	fi
`;

const validatePorts = () => `
	# check if something is running on port 80
	if ss -tulnp | grep ':80 ' >/dev/null; then
		echo "Something is already running on port 80" >&2
	fi

	# check if something is running on port 443
	if ss -tulnp | grep ':443 ' >/dev/null; then
		echo "Something is already running on port 443" >&2
	fi
`;

const installUtilities = () => `

	case "$OS_TYPE" in
	arch)
		pacman -Sy --noconfirm --needed curl wget git git-lfs jq openssl >/dev/null || true
		;;
	alpine)
		sed -i '/^#.*\/community/s/^#//' /etc/apk/repositories
		apk update >/dev/null
		apk add curl wget git git-lfs jq openssl sudo unzip tar >/dev/null
		;;
	ubuntu | debian | raspbian)
		DEBIAN_FRONTEND=noninteractive apt-get update -y >/dev/null
		DEBIAN_FRONTEND=noninteractive apt-get install -y unzip curl wget git git-lfs jq openssl >/dev/null
		;;
	centos | fedora | rhel | ol | rocky | almalinux | opencloudos | amzn)
		if [ "$OS_TYPE" = "amzn" ]; then
			dnf install -y wget git git-lfs jq openssl >/dev/null
		else
			if ! command -v dnf >/dev/null; then
				yum install -y dnf >/dev/null
			fi
			if ! command -v curl >/dev/null; then
				dnf install -y curl >/dev/null
			fi
			dnf install -y wget git git-lfs jq openssl unzip >/dev/null
		fi
		;;
	sles | opensuse-leap | opensuse-tumbleweed)
		zypper refresh >/dev/null
		zypper install -y curl wget git git-lfs jq openssl >/dev/null
		;;
	*)
		echo "This script only supports Debian, Redhat, Arch Linux, or SLES based operating systems for now."
		exit
		;;
	esac
`;

const installDocker = () => `

# Detect if docker is installed via snap
if [ -x "$(command -v snap)" ]; then
    SNAP_DOCKER_INSTALLED=$(snap list docker >/dev/null 2>&1 && echo "true" || echo "false")
    if [ "$SNAP_DOCKER_INSTALLED" = "true" ]; then
        echo " - Docker is installed via snap."
        echo "   Please note that ${BRAND_NAME} does not support Docker installed via snap."
        echo "   Please remove Docker with snap (snap remove docker) and reexecute this script."
        exit 1
    fi
fi

echo -e "3. Check Docker Installation. "
if ! [ -x "$(command -v docker)" ]; then
    echo " - Docker is not installed. Installing Docker. It may take a while."
    case "$OS_TYPE" in
        "almalinux")
            dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo >/dev/null 2>&1
            dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Docker could not be installed automatically. Please visit https://docs.docker.com/engine/install/ and install Docker manually to continue."
                exit 1
            fi
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            ;;
	"opencloudos")
            # Special handling for OpenCloud OS
            echo " - Installing Docker for OpenCloud OS..."
            dnf install -y docker >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Docker could not be installed automatically. Please visit https://docs.docker.com/engine/install/ and install Docker manually to continue."
                exit 1
            fi
            
            # Remove --live-restore parameter from Docker configuration if it exists
            if [ -f "/etc/sysconfig/docker" ]; then
                echo " - Removing --live-restore parameter from Docker configuration..."
                sed -i 's/--live-restore[^[:space:]]*//' /etc/sysconfig/docker >/dev/null 2>&1
                sed -i 's/--live-restore//' /etc/sysconfig/docker >/dev/null 2>&1
                # Clean up any double spaces that might be left
                sed -i 's/  */ /g' /etc/sysconfig/docker >/dev/null 2>&1
            fi
            
            systemctl enable docker >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            echo " - Docker configured for OpenCloud OS"
            ;;
        "alpine")
            apk add docker docker-cli-compose >/dev/null 2>&1
            rc-update add docker default >/dev/null 2>&1
            service docker start >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Failed to install Docker with apk. Try to install it manually."
                echo "   Please visit https://wiki.alpinelinux.org/wiki/Docker for more information."
                exit 1
            fi
            ;;
        "arch")
            pacman -Sy docker docker-compose --noconfirm >/dev/null 2>&1
            systemctl enable docker.service >/dev/null 2>&1
            systemctl start docker.service >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Failed to install Docker with pacman. Try to install it manually."
                echo "   Please visit https://wiki.archlinux.org/title/docker for more information."
                exit 1
            fi
            ;;
        "amzn")
            dnf install docker -y >/dev/null 2>&1
            DOCKER_CONFIG=/usr/local/lib/docker
            mkdir -p $DOCKER_CONFIG/cli-plugins >/dev/null 2>&1
            curl -sL https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o $DOCKER_CONFIG/cli-plugins/docker-compose >/dev/null 2>&1
            chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Failed to install Docker with dnf. Try to install it manually."
                echo "   Please visit https://www.cyberciti.biz/faq/how-to-install-docker-on-amazon-linux-2/ for more information."
                exit 1
            fi
            ;;
        "fedora")
            if [ -x "$(command -v dnf5)" ]; then
                # dnf5 is available
                dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo --overwrite >/dev/null 2>&1
            else
                # dnf5 is not available, use dnf
                dnf config-manager --add-repo=https://download.docker.com/linux/fedora/docker-ce.repo >/dev/null 2>&1
            fi
            dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                echo " - Docker could not be installed automatically. Please visit https://docs.docker.com/engine/install/ and install Docker manually to continue."
                exit 1
            fi
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            ;;
        *)
            if [ "$OS_TYPE" = "ubuntu" ] && [ "$OS_VERSION" = "24.10" ]; then
                echo "Docker automated installation is not supported on Ubuntu 24.10 (non-LTS release)."
                    echo "Please install Docker manually."
                exit 1
            fi
            curl -s https://releases.rancher.com/install-docker/$DOCKER_VERSION.sh | sh 2>&1
            if ! [ -x "$(command -v docker)" ]; then
                curl -s https://get.docker.com | sh -s -- --version $DOCKER_VERSION 2>&1
                if ! [ -x "$(command -v docker)" ]; then
                    echo " - Docker installation failed."
                    echo "   Maybe your OS is not supported?"
                    echo " - Please visit https://docs.docker.com/engine/install/ and install Docker manually to continue."
                    exit 1
                fi
            fi
			if [ "$OS_TYPE" = "rocky" ]; then
				systemctl start docker >/dev/null 2>&1
				systemctl enable docker >/dev/null 2>&1
			fi

			if [ "$OS_TYPE" = "centos" ]; then
				systemctl start docker >/dev/null 2>&1
				systemctl enable docker >/dev/null 2>&1
			fi


    esac
    echo " - Docker installed successfully."

    if [ -n "$TARGET_USER" ] && [ "$TARGET_USER" != "root" ] && id "$TARGET_USER" >/dev/null 2>&1; then
        if id -nG "$TARGET_USER" | grep -qw docker; then
            echo " - User $TARGET_USER already in docker group."
        else
            usermod -aG docker "$TARGET_USER"
            echo " - Added $TARGET_USER to docker group (log out/in required to apply)."
        fi
    fi
else
    echo " - Docker is installed."
fi
`;

const createTraefikConfig = () => {
	const config = getDefaultServerTraefikConfig();
	const { MAIN_TRAEFIK_PATH, DYNAMIC_TRAEFIK_PATH } = paths(true);
	const traefikConfigPath = path.join(MAIN_TRAEFIK_PATH, "traefik.yml");
	const acmeJsonPath = path.join(DYNAMIC_TRAEFIK_PATH, "acme.json");

	const command = `
	if [ -f "${acmeJsonPath}" ]; then
		chmod 600 "${acmeJsonPath}"
	fi
	if [ -f "${traefikConfigPath}" ]; then
		echo "Traefik config already exists ✅"
	else
		echo "${config}" > "${traefikConfigPath}"
	fi
	`;

	return command;
};

const createDefaultMiddlewares = () => {
	const config = getDefaultMiddlewares();
	const { DYNAMIC_TRAEFIK_PATH } = paths(true);
	const middlewaresPath = path.join(DYNAMIC_TRAEFIK_PATH, "middlewares.yml");
	const command = `
	if [ -f "${middlewaresPath}" ]; then
		echo "Middlewares config already exists ✅"
	else
		echo "${config}" > "${middlewaresPath}"
	fi
	`;
	return command;
};

export const installRClone = () => `
    if command_exists rclone; then
		echo "RClone already installed ✅"
	else
		curl -fsSL https://rclone.org/install.sh | bash
		RCLONE_VERSION=$(rclone --version | head -n 1 | awk '{print $2}' | sed 's/^v//')
		echo "RClone version $RCLONE_VERSION installed ✅"
	fi
`;

export const createTraefikInstance = () => {
	const command = `
	    # Check if dokpyloy-traefik exists
		if docker service inspect guildserver-traefik > /dev/null 2>&1; then
			echo "Migrating Traefik to Standalone..."
			docker service rm guildserver-traefik
			sleep 8
			echo "Traefik migrated to Standalone ✅"
		fi

		if docker inspect guildserver-traefik > /dev/null 2>&1; then
			echo "Traefik already exists ✅"
		else
			# Create the guildserver-traefik container
			TRAEFIK_VERSION=${TRAEFIK_VERSION}
			docker run -d \
				--name guildserver-traefik \
				--network guildserver-network \
				--restart unless-stopped \
				-v /etc/guildserver/traefik/traefik.yml:/etc/traefik/traefik.yml \
				-v /etc/guildserver/traefik/dynamic:/etc/guildserver/traefik/dynamic \
				-v /var/run/docker.sock:/var/run/docker.sock \
				-p ${TRAEFIK_SSL_PORT}:${TRAEFIK_SSL_PORT} \
				-p ${TRAEFIK_PORT}:${TRAEFIK_PORT} \
				-p ${TRAEFIK_HTTP3_PORT}:${TRAEFIK_HTTP3_PORT}/udp \
				traefik:v$TRAEFIK_VERSION
			echo "Traefik version $TRAEFIK_VERSION installed ✅"
		fi
	`;

	return command;
};

const installNixpacks = () => `
	if command_exists nixpacks; then
		echo "Nixpacks already installed ✅"
	else
	    export NIXPACKS_VERSION=1.39.0
        bash -c "$(curl -fsSL https://nixpacks.com/install.sh)"
		echo "Nixpacks version $NIXPACKS_VERSION installed ✅"
	fi
`;

const installRailpack = () => `
	if command_exists railpack; then
		echo "Railpack already installed ✅"
	else
	    export RAILPACK_VERSION=0.2.2
		bash -c "$(curl -fsSL https://railpack.com/install.sh)"
		echo "Railpack version $RAILPACK_VERSION installed ✅"
	fi
`;

const installBuildpacks = () => `
	SUFFIX=""
	if [ "$SYS_ARCH" = "aarch64" ] || [ "$SYS_ARCH" = "arm64" ]; then
		SUFFIX="-arm64"
	fi
	if command_exists pack; then
		echo "Buildpacks already installed ✅"
	else
		BUILDPACKS_VERSION=0.35.0
		curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.35.0/pack-v$BUILDPACKS_VERSION-linux$SUFFIX.tgz" | tar -C /usr/local/bin/ --no-same-owner -xzv pack
		echo "Buildpacks version $BUILDPACKS_VERSION installed ✅"
	fi
`;
