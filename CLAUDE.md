# Minhas Fichas — instruções para o Claude

- Código do app da consultora. Contexto, decisões e aprendizados ficam no
  repositório da CIP (`drikaoliveira/cip`, `projects/aplicativo-consultora/`):
  leia o `brain.md` de lá antes de mudanças de produto e registre decisões
  no `journal.md` de lá, não aqui.
- Usuária: consultora sem perfil técnico, no celular Android. Botões
  grandes, poucos passos, português do Brasil, R$ 0,00 e DD/MM/AAAA.
- Modelo financeiro = conta corrente da ficha (`customers` + `entries`).
  Saldo nunca é guardado; lançamentos nunca são editados ou apagados
  (estorno). Mudanças no banco = nova migração em `supabase/migrations/`.
- Dados de clientes nunca no repositório, nem em testes (use dados fictícios).
- Antes de commitar: `npx tsc -p .` e `npm test`.
