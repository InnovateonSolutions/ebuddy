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

GitLab no puede ejecutar pipelines hasta que exista al menos un runner. Por eso
el primer registro se hace desde la maquina de operacion con Ansible.

1. Crear un project runner en GitLab:

   `Settings -> CI/CD -> Runners -> New project runner`

2. Usar tags:

   `linux,docker,elitemini`

3. Copiar el token `glrt-...` y exportarlo localmente:

```bash
export GITLAB_RUNNER_TOKEN='glrt-REEMPLAZAR'
```

4. Ejecutar el playbook:

```bash
ANSIBLE_CONFIG=infra/ansible/ansible.cfg \
ansible-playbook infra/ansible/playbooks/install-gitlab-runner.yml \
  --extra-vars "gitlab_runner_token=$GITLAB_RUNNER_TOKEN"
```

El role instala Docker, instala `gitlab-runner` desde el repositorio oficial de
GitLab, registra el runner con Docker executor y deja el servicio habilitado.

## Despues del bootstrap

Los pipelines de GitLab usan runners con tags `linux,docker,elitemini`. Los jobs
sin tag no deben correr en este runner.

Referencia oficial:

- https://docs.gitlab.com/runner/register/
- https://docs.gitlab.com/runner/executors/docker/
