# Homelab — MINISFORUM UM890 Pro

> **Estado:** Mini PC llega el 19 de abril de 2026.
> Ver [ADR 005](../architecture/adr/005-openclaw-homelab.md) para el razonamiento de la decisión.

---

## Hardware

| Atributo | Valor |
|---|---|
| Modelo | MINISFORUM UM890 Pro |
| CPU | AMD Ryzen 9 8945HS — 8C/16T, hasta 5.2 GHz |
| GPU integrada | AMD Radeon 780M (12 CUs, RDNA 3) |
| NPU | AMD XDNA — aceleración de inferencia local |
| Ethernet | 2x RJ45 2.5 GbE |
| USB | 2x USB4 (8K) + 4x USB 3.2 |
| Video | 1x HDMI 4K + 1x DP 4K |
| Bluetooth | 5.2 |
| Versión | Barebone — sin RAM ni storage |

### RAM y Storage recomendados

| Componente | Recomendado | Mínimo |
|---|---|---|
| RAM | 32 GB DDR5 5600 MHz (2×16 GB) | 16 GB |
| Storage | NVMe PCIe 4.0 1 TB | 512 GB |

Con 32 GB: OpenClaw + modelos IA locales pequeños (Mistral 7B, Llama 3 8B via Ollama) + ebuddy si se quiere self-hostear todo.

---

## OS Recomendado

**Ubuntu 24.04 LTS** — máximo soporte de hardware AMD, Docker estable, compatibilidad con OpenClaw.

> Si se quiere iMessage: conectar vía [Beeper](https://www.beeper.com/) o puente desde Mac cercano. iMessage nativo requiere macOS.

---

## Setup inicial (cuando llegue el 19 de abril)

### 1. Instalar Ubuntu 24.04

```bash
# Crear USB booteable con Ubuntu 24.04
# https://ubuntu.com/download/desktop

# Durante la instalación:
# - Hostname: ebuddy-homelab
# - Usuario: mct
# - Habilitar SSH durante la instalación
# - Partición: usar todo el disco NVMe
```

### 2. Configuración post-instalación

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas base
sudo apt install -y \
  curl wget git vim htop \
  build-essential \
  net-tools openssh-server

# Habilitar SSH al inicio
sudo systemctl enable --now ssh
```

### 3. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker  # aplicar sin reiniciar
docker --version  # verificar
```

### 4. Instalar OpenClaw

```bash
# Seguir instrucciones oficiales en docs.openclaw.ai
# Instalación típica en Linux:
curl -fsSL https://install.openclaw.ai | bash

# O desde el repositorio GitHub:
# https://github.com/openclaw-ai/openclaw

openclaw --version
openclaw setup  # configuración inicial (elegir modelo de IA)
```

### 5. Configurar skill de ebuddy en OpenClaw

```bash
# Clonar o crear el skill
git clone <repo-ebuddy-skill> ~/.openclaw/skills/ebuddy
# O crear manualmente según docs/integrations/openclaw.md

openclaw skill install ebuddy
openclaw skill config ebuddy EBUDDY_API_URL https://app.ebuddy.io
openclaw skill config ebuddy EBUDDY_API_KEY <api_key_generada_en_ebuddy>
```

### 6. Conectar WhatsApp / Telegram

```bash
# WhatsApp — OpenClaw muestra QR para escanear con tu teléfono
openclaw connect whatsapp

# Telegram — requiere crear un bot en @BotFather
# https://docs.openclaw.ai/integrations/telegram
openclaw connect telegram --token <bot_token>
```

---

## Red doméstica

El mini PC tiene **2x RJ45** — configuración recomendada:

| Puerto | Uso |
|---|---|
| NIC 1 | Red doméstica (DHCP, acceso a internet) |
| NIC 2 | Reservado (futuro: red separada para servicios) |

### IP fija en la red local

```bash
# Asignar IP fija al mini PC en el router (por MAC address)
# O configurar en Ubuntu:
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  ethernets:
    enp1s0:  # ajustar nombre de interfaz: ip link show
      dhcp4: no
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

```bash
sudo netplan apply
```

---

## Acceso remoto al mini PC

Para administrar el mini PC desde tu laptop (WSL, Mac, etc.):

```bash
# Desde tu laptop — acceso SSH local
ssh mct@192.168.1.100

# Alias útil en ~/.ssh/config de tu laptop:
Host homelab
  HostName 192.168.1.100
  User mct
  IdentityFile ~/.ssh/id_ed25519

# Uso:
ssh homelab
```

---

## Futuro: Modelos IA locales con Ollama

El Ryzen 9 8945HS + Radeon 780M permite correr modelos pequeños localmente:

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Correr modelos
ollama pull mistral        # 7B — bueno para clasificación de tickets
ollama pull llama3:8b      # 8B — alternativa a Claude para pruebas
ollama pull phi3:mini      # 3.8B — muy rápido, bueno para tareas simples

# Exponer API compatible con OpenAI (para usar en ebuddy como alternativa a Claude)
ollama serve  # http://localhost:11434
```

Cuando se quiera reducir costos de API, se puede configurar ebuddy para usar Ollama local en vez de Claude API — solo cambiando la variable `ANTHROPIC_API_KEY` por la URL de Ollama en `IAIService`.
