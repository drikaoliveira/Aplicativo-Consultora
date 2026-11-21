# Minhas Fichas

App web (PWA) para uma consultora Natura trocar as fichas de papel por
uma ficha digital: clientes, vendas fiado, pagamentos e **cobrança do mês
por bairro**, com leitura de código de barras.

O contexto do projeto (por quê, decisões, aprendizados) fica no
repositório da CIP, em `projects/aplicativo-consultora/`.

## Como funciona

- **Ficha = conta corrente**, igual ao papel: cada linha é uma venda
  (débito) ou um pagamento (crédito). O saldo é sempre a soma — nunca é
  digitado.
- **Nada é apagado.** Um lançamento errado é corrigido com um estorno: a
  linha original fica riscada e a correção aparece na ficha.
- **Cobrar este mês:** clientes com saldo agrupadas por bairro; quem está
  há mais tempo sem pagar vem primeiro. Dali: WhatsApp (mensagem editável,
  nunca enviada sozinha), "Recebi" e rota no Google Maps (até 10 paradas).
- **Código de barras:** lê pela câmera. Se o produto está no catálogo,
  entra com nome e preço (o preço continua editável). Se não está, o app
  pede nome e preço uma vez e guarda.
- **Dois catálogos:**
  - **Catálogo Natura (central):** um só para todas as consultoras.
    Todas leem; só administradoras importam/editam.
  - **Meus produtos:** outras marcas de cada consultora (Tupperware, etc.).
    Só ela vê. Código lido que não está em nenhum dos dois vira "meu produto".

## Configuração (uma vez)

### 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. **SQL Editor** → cole e rode, **nesta ordem**, cada arquivo de
   `supabase/migrations/` (`0001_…`, depois `0002_…`).
3. **Authentication → Users → Add user**: crie o usuário da consultora
   (e-mail e senha), marcando *Auto Confirm User*.
4. **Authentication → Sign In / Providers**: desligue *Allow new users to
   sign up* (só quem você cadastrar entra).
5. **Authentication → URL Configuration**: em *Site URL*, coloque o
   endereço do Netlify (ex.: `https://minhas-fichas.netlify.app`). É para
   onde vai o link de "Esqueci a senha".
6. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.

### 2. Netlify

1. *Add new site → Import from Git* → este repositório.
2. Build já vem do `netlify.toml` (`npm run build`, pasta `dist`).
3. *Site configuration → Environment variables*:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
4. *Deploy*. Depois, no celular (Chrome), abra o endereço e use
   **⋮ → Adicionar à tela inicial**.

A chave *anon* é pública por natureza (vai no app); quem protege os dados
é o Row Level Security do banco. **Nunca** coloque a chave
*service_role* no app nem no repositório.

### 3. Administradora do catálogo central

Crie o seu usuário (Authentication → Users → Add user) e, no SQL Editor:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'SEU-EMAIL-AQUI';
```

Só administradoras importam ou editam o catálogo Natura.

### 4. Catálogo do PDV

Exporte do PDV os produtos com **código de barras, descrição e preço**,
salve como **CSV** e importe em *Mais → Importar produtos* logada como
**administradora**, escolhendo **Catálogo Natura**. Todas as consultoras
passam a ver. Cada consultora importa ou cadastra as outras marcas dela em
"Meus produtos". O app reconhece
colunas como "Cód. Barras"/"EAN", "Descrição" e "Preço"; dá para ajustar
antes de importar. Reimportar atualiza os preços dos produtos que já
existem (mesmo código de barras).

## Desenvolvimento

```bash
cp .env.example .env   # preencha
npm install
npm run dev
npm test
```

Estrutura:

- `supabase/migrations/` — banco (tabelas, trigger do saldo, RLS, view).
- `src/lib/` — regras (valores, cobrança por bairro, carrinho, importação, links).
- `src/pages/` — telas. `src/components/` — peças reutilizadas.
- `tests/` — testes das regras (`npm test`).

Dados de clientes **nunca** entram no repositório (`*.csv` e `*.xlsx`
estão no `.gitignore`).
