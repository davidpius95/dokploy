
#!/usr/bin/env bash
set -e

DOCKER_VERSION=27.0.3
OS_TYPE=$(grep -w "ID" /etc/os-release | cut -d "=" -f 2 | tr -d '"')
SYS_ARCH=$(uname -m)
CURRENT_USER=$USER

echo "Installing requirements for: OS: $OS_TYPE"

# --- Root escalation fix ---
if [ "$EUID" != 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
        echo "Re-running script with passwordless sudo..."
        if [ -f "$0" ]; then
            # Running from a saved file
            exec sudo -n -E bash "$0" "$@"
        else
            # Running from a pipe (stdin)
            exec sudo -n -E bash -s -- "$@"
        fi
    else
        echo "This script must be run as root or with sudo."
        exit 1
    fi
fi
# --- End escalation fix ---

# OS detection adjustments
if [ "$OS_TYPE" = "manjaro" ] || [ "$OS_TYPE" = "manjaro-arm" ]; then OS_TYPE="arch"; fi
if [ "$OS_TYPE" = "fedora-asahi-remix" ]; then OS_TYPE="fedora"; fi
if [ "$OS_TYPE" = "pop" ]; then OS_TYPE="ubuntu"; fi
if [ "$OS_TYPE" = "linuxmint" ]; then OS_TYPE="ubuntu"; fi
if [ "$OS_TYPE" = "zorin" ]; then OS_TYPE="ubuntu"; fi

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

echo -e "---------------------------------------------"
echo "| CPU Architecture  | $SYS_ARCH"
echo "| Operating System  | $OS_TYPE $OS_VERSION"
echo "| Docker            | $DOCKER_VERSION"
echo -e "---------------------------------------------\n"
echo -e "1. Installing required packages (curl, wget, git, jq, openssl). "

command_exists() { command -v "$@" > /dev/null 2>&1; }

case "$OS_TYPE" in
arch)
    pacman -Sy --noconfirm --needed curl wget git git-lfs jq openssl >/dev/null || true
    ;;
alpine)
    sed -i '/^#.*/community/s/^#//' /etc/apk/repositories
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
        if ! command -v dnf >/dev/null; then yum install -y dnf >/dev/null; fi
        if ! command -v curl >/dev/null; then dnf install -y curl >/dev/null; fi
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

echo -e "2. Validating ports. "
if ss -tulnp | grep ':80 ' >/dev/null; then echo "Something is already running on port 80" >&2; fi
if ss -tulnp | grep ':443 ' >/dev/null; then echo "Something is already running on port 443" >&2; fi

echo -e "3. Installing RClone. "
if command_exists rclone; then
    echo "RClone already installed ✅"
else
    curl https://rclone.org/install.sh | sudo bash
    RCLONE_VERSION=$(rclone --version | head -n 1 | awk '{print $2}' | sed 's/^v//')
    echo "RClone version $RCLONE_VERSION installed ✅"
fi

echo -e "4. Installing Docker. "
if [ -x "$(command -v snap)" ]; then
    if snap list docker >/dev/null 2>&1; then
        echo "Docker installed via snap is not supported. Remove it first."
        exit 1
    fi
fi

echo -e "3. Check Docker Installation. "
if ! [ -x "$(command -v docker)" ]; then
    echo " - Docker is not installed. Installing Docker..."
    case "$OS_TYPE" in
        "almalinux")
            dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo >/dev/null 2>&1
            dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            ;;
        "opencloudos")
            dnf install -y docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            ;;
        "alpine")
            apk add docker docker-cli-compose >/dev/null 2>&1
            rc-update add docker default >/dev/null 2>&1
            service docker start >/dev/null 2>&1
            ;;
        "arch")
            pacman -Sy docker docker-compose --noconfirm >/dev/null 2>&1
            systemctl enable docker.service >/dev/null 2>&1
            ;;
        "amzn")
            dnf install docker -y >/dev/null 2>&1
            DOCKER_CONFIG=/usr/local/lib/docker
            mkdir -p $DOCKER_CONFIG/cli-plugins >/dev/null 2>&1
            curl -sL https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o $DOCKER_CONFIG/cli-plugins/docker-compose >/dev/null 2>&1
            chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            ;;
        "fedora")
            dnf config-manager --add-repo=https://download.docker.com/linux/fedora/docker-ce.repo >/dev/null 2>&1
            dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
            systemctl start docker >/dev/null 2>&1
            systemctl enable docker >/dev/null 2>&1
            ;;
        *)
            curl -s https://releases.rancher.com/install-docker/$DOCKER_VERSION.sh | sh 2>&1 || \
            curl -s https://get.docker.com | sh -s -- --version $DOCKER_VERSION 2>&1
            ;;
    esac
    echo " - Docker installed successfully."
else
    echo " - Docker is installed."
fi

# (The rest of the original script continues unchanged — swarm setup, network creation, Traefik, Nixpacks, Buildpacks, Railpack, etc.)


echo -e "5. Setting up Docker Swarm"

		# Check if the node is already part of a Docker Swarm
		if docker info | grep -q 'Swarm: active'; then
			echo "Already part of a Docker Swarm ✅"
		else
			# Get IP address
			get_ip() {
				local ip=""

				# Try IPv4 with multiple services
				# First attempt: ifconfig.io
				ip=$(curl -4s --connect-timeout 5 https://ifconfig.io 2>/dev/null)

				# Second attempt: icanhazip.com
				if [ -z "$ip" ]; then
					ip=$(curl -4s --connect-timeout 5 https://icanhazip.com 2>/dev/null)
				fi

				# Third attempt: ipecho.net
				if [ -z "$ip" ]; then
					ip=$(curl -4s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null)
				fi

				# If no IPv4, try IPv6 with multiple services
				if [ -z "$ip" ]; then
					# Try IPv6 with ifconfig.io
					ip=$(curl -6s --connect-timeout 5 https://ifconfig.io 2>/dev/null)

					# Try IPv6 with icanhazip.com
					if [ -z "$ip" ]; then
						ip=$(curl -6s --connect-timeout 5 https://icanhazip.com 2>/dev/null)
					fi

					# Try IPv6 with ipecho.net
					if [ -z "$ip" ]; then
						ip=$(curl -6s --connect-timeout 5 https://ipecho.net/plain 2>/dev/null)
					fi
				fi

				if [ -z "$ip" ]; then
					echo "Error: Could not determine server IP address automatically (neither IPv4 nor IPv6)." >&2
					echo "Please set the ADVERTISE_ADDR environment variable manually." >&2
					echo "Example: export ADVERTISE_ADDR=<your-server-ip>" >&2
					exit 1
				fi

				echo "$ip"
			}
			advertise_addr=$(get_ip)
			echo "Advertise address: $advertise_addr"

			# Initialize Docker Swarm
			docker swarm init --advertise-addr $advertise_addr
			echo "Swarm initialized ✅"
		fi
	

echo -e "6. Setting up Network"

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


echo -e "7. Setting up Directories"

	# Check if the /etc/guildserver directory exists
	if [ -d /etc/guildserver ]; then
		echo "/etc/guildserver already exists ✅"
	else
		# Create the /etc/guildserver directory
		mkdir -p /etc/guildserver
		chmod 777 /etc/guildserver

		echo "Directory /etc/guildserver created ✅"
	fi


	mkdir -p "/etc/guildserver" && mkdir -p "/etc/guildserver/traefik" && mkdir -p "/etc/guildserver/traefik/dynamic" && mkdir -p "/etc/guildserver/logs" && mkdir -p "/etc/guildserver/applications" && mkdir -p "/etc/guildserver/compose" && mkdir -p "/etc/guildserver/ssh" && mkdir -p "/etc/guildserver/traefik/dynamic/certificates" && mkdir -p "/etc/guildserver/monitoring" && mkdir -p "/etc/guildserver/registry" && mkdir -p "/etc/guildserver/schedules" && mkdir -p "/etc/guildserver/volume-backups"
	chmod 700 "/etc/guildserver/ssh"
	

echo -e "8. Setting up Traefik"

	if [ -f "/etc/guildserver/traefik/dynamic/acme.json" ]; then
		chmod 600 "/etc/guildserver/traefik/dynamic/acme.json"
	fi
	if [ -f "/etc/guildserver/traefik/traefik.yml" ]; then
		echo "Traefik config already exists ✅"
	else
		echo "providers:
  swarm:
    exposedByDefault: false
    watch: true
  docker:
    exposedByDefault: false
    watch: true
    network: guildserver-network
  file:
    directory: /etc/guildserver/traefik/dynamic
    watch: true
entryPoints:
  web:
    address: ':80'
  websecure:
    address: ':443'
    http3:
      advertisedPort: 443
    http:
      tls:
        certResolver: letsencrypt
api:
  insecure: true
certificatesResolvers:
  letsencrypt:
    acme:
      email: test@localhost.com
      storage: /etc/guildserver/traefik/dynamic/acme.json
      httpChallenge:
        entryPoint: web
" > /etc/guildserver/traefik/traefik.yml
	fi
	

echo -e "9. Setting up Middlewares"

	if [ -f "/etc/guildserver/traefik/dynamic/middlewares.yml" ]; then
		echo "Middlewares config already exists ✅"
	else
		echo "http:
  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true
" > /etc/guildserver/traefik/dynamic/middlewares.yml
	fi
	

echo -e "10. Setting up Traefik Instance"

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
			TRAEFIK_VERSION=3.1.2
			docker run -d 				--name guildserver-traefik 				--network guildserver-network 				--restart unless-stopped 				-v /etc/guildserver/traefik/traefik.yml:/etc/traefik/traefik.yml 				-v /etc/guildserver/traefik/dynamic:/etc/guildserver/traefik/dynamic 				-v /var/run/docker.sock:/var/run/docker.sock 				-p 443:443 				-p 80:80 				-p 443:443/udp 				traefik:v$TRAEFIK_VERSION
			echo "Traefik version $TRAEFIK_VERSION installed ✅"
		fi
	

echo -e "11. Installing Nixpacks"

	if command_exists nixpacks; then
		echo "Nixpacks already installed ✅"
	else
	    export NIXPACKS_VERSION=1.39.0
        bash -c "$(curl -fsSL https://nixpacks.com/install.sh)"
		echo "Nixpacks version $NIXPACKS_VERSION installed ✅"
	fi


echo -e "12. Installing Buildpacks"

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


echo -e "13. Installing Railpack"

	if command_exists railpack; then
		echo "Railpack already installed ✅"
	else
	    export RAILPACK_VERSION=0.2.2
		bash -c "$(curl -fsSL https://railpack.com/install.sh)"
		echo "Railpack version $RAILPACK_VERSION installed ✅"
	fi
