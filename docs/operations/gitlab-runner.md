# GitLab Runner en elitemini

## Objetivo

El runner de GitLab debe administrarse con Ansible y registrarse contra
`https://gitlab.innovateoncorp.com`.

Configuracion inicial:

- host: `elitemini`
- executor: `docker`
- default image: `ubuntu:24.04`
- tags: `linux,docker,elitemini`
- jobs sin tag: deshabilitados

## Bootstrap inicial

GitLab no puede ejecutar pipelines hasta que exista al menos un runner.

### Paso 1 — Crear el runner en GitLab y obtener el token

1. `Settings → CI/CD → Runners → New project runner`
2. Tags: `linux,docker,elitemini`
3. Copiar el token `glrt-...`

### Paso 2 — Guardar el token en GitHub

`Settings → Secrets and variables → Actions → New repository secret`

- Nombre: `GITLAB_RUNNER_TOKEN`
- Valor: el token `glrt-...`

### Paso 3 — Disparar el playbook desde GitHub Actions

`Actions → Setup — Server Playbooks → Run workflow`

- target: `elitemini`
- playbook: `install-gitlab-runner`

El workflow conecta a elitemini vía Tailscale y ejecuta el role Ansible.
El token nunca aparece en logs (`no_log: true` en el role).

### Alternativa local (sin GitHub Actions)

```bash
export GITLAB_RUNNER_TOKEN='glrt-REEMPLAZAR'

ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
ansible-playbook infra/ansible/playbooks/install-gitlab-runner.yml \
  --extra-vars "gitlab_runner_token=$GITLAB_RUNNER_TOKEN"
```

El role instala Docker, instala `gitlab-runner` desde el repositorio oficial de
GitLab, registra el runner con Docker executor y deja el servicio habilitado.

## Rotación del token

1. En GitLab: `Settings → CI/CD → Runners → (runner) → Reset token`
2. Actualizar el secret `GITLAB_RUNNER_TOKEN` en GitHub
3. Re-ejecutar el workflow (Paso 3)

## Después del bootstrap

Los pipelines de GitLab usan runners con tags `linux,docker,elitemini`. Los jobs
sin tag no deben correr en este runner.

Referencia oficial:

- https://docs.gitlab.com/runner/register/
- https://docs.gitlab.com/runner/executors/docker/
