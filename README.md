# Merger PDF

Este projeto é um servidor Express que permite mesclar múltiplos arquivos PDF em um único documento PDF.

## Pré-requisitos

- Node.js (versão 20 ou superior)
- npm (geralmente incluído com o Node.js)

## Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/seu-usuario/merger-pdf.git
   cd merger-pdf
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

## Scripts Disponíveis

- `npm start`: Inicia o servidor em modo de desenvolvimento usando `ts-node`.
- `npm run build`: Compila o código TypeScript para JavaScript.
- `npm run serve`: Inicia o servidor a partir do código compilado na pasta `dist`.

## Uso

1. Inicie o servidor:

   ```bash
   npm start
   ```

2. Faça uma solicitação POST para a rota `/` com um corpo JSON contendo `title` e `sources` (uma lista de URLs de arquivos PDF):

   ```json
   {
     "title": "nome-do-arquivo",
     "sources": [
       "https://exemplo.com/arquivo1.pdf",
       "https://exemplo.com/arquivo2.pdf"
     ]
   }
   ```

3. Acesse a rota de verificação de saúde para garantir que o servidor está funcionando:

   ```bash
   curl http://localhost:3000/health
   ```

## Estrutura do Projeto

- `src/`: Contém o código fonte do servidor.
- `dist/`: Contém o código compilado (após rodar `npm run build`).

## Contribuição

1. Faça um fork do projeto.
2. Crie uma nova branch (`git checkout -b feature/nova-feature`).
3. Faça commit das suas alterações (`git commit -am 'Adiciona nova feature'`).
4. Faça push para a branch (`git push origin feature/nova-feature`).
5. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes. 