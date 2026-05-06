# Documento de Requisitos — KwanzaProfit PWA

## Introdução

O **KwanzaProfit** é um Progressive Web App (PWA) _mobile-first_ destinado a uma casa de câmbios em Angola. O objetivo do sistema é permitir ao operador registrar vendas de moeda estrangeira (USD, EUR, GBP, ZAR, entre outras) e acompanhar o **lucro total em Kwanzas (AOA)** acumulado a partir dessas operações.

O aplicativo é de uso pessoal/local para a casa de câmbios e **não possui backend**: todos os dados são persistidos no próprio dispositivo do usuário. Deve ser instalável como PWA, funcionar offline e seguir integralmente o design system institucional definido em `Design system/Design Sytem/DESIGN.md`, com telas de referência em `Design system/Dashboard/code.html` e `Design system/Cadastro/code.html`.

Os requisitos a seguir descrevem o **quê** o sistema deve fazer, mantendo-se livres de decisões de implementação específicas (essas serão detalhadas na fase de Design).

## Glossário

- **KwanzaProfit**: O PWA completo descrito neste documento. Também referenciado como **App** ou **Sistema**.
- **AOA**: Kwanza Angolano, moeda oficial de Angola e única moeda de apuração de lucro no sistema.
- **Moeda_Estrangeira**: Moeda distinta de AOA, vendida ao cliente. O conjunto inicial suportado é {USD, EUR, GBP, ZAR}.
- **Venda**: Registro imutável de uma transação de câmbio composto por: identificador único, nome do cliente, moeda estrangeira, quantidade vendida na moeda estrangeira, lucro em AOA e carimbo de data/hora (_timestamp_) de criação.
- **Lucro_Total**: Soma aritmética dos lucros em AOA de todas as Vendas persistidas que não estejam marcadas como excluídas.
- **Dashboard**: Tela principal do app, que apresenta o Lucro_Total e o Histórico_de_Vendas.
- **Histórico_de_Vendas**: Lista de Vendas previamente registradas, exibida no Dashboard e na tela History.
- **Registrador_de_Venda**: Tela de formulário para criar uma nova Venda.
- **FAB**: _Floating Action Button_ com ícone "+" que abre o Registrador_de_Venda.
- **Armazenamento_Local**: Mecanismo de persistência no dispositivo do usuário (por exemplo, IndexedDB ou localStorage). A escolha concreta será definida no Design.
- **Service_Worker**: Componente do PWA responsável por caching e operação offline.
- **Manifesto_PWA**: Arquivo `manifest.webmanifest` que permite instalação do app.
- **Formatador_de_Moeda**: Componente lógico que formata valores numéricos para exibição conforme a moeda (separador de milhar, casas decimais, símbolo e posição do símbolo).
- **Design_System**: Conjunto de tokens de cor, tipografia, espaçamento e componentes definido em `Design system/Design Sytem/DESIGN.md`.

## Requisitos

### Requisito 1: Registrar uma nova Venda

**User Story:** Como operador da casa de câmbios, quero cadastrar uma nova venda de moeda estrangeira informando cliente, moeda, quantidade e lucro, para registrar a operação no sistema.

#### Critérios de Aceitação

1. THE Registrador_de_Venda SHALL exibir os campos "Nome do Cliente" (texto), "Moeda" (seleção), "Quantidade Vendida" (numérico decimal) e "Lucro Estimado (AOA)" (numérico decimal).
2. THE Registrador_de_Venda SHALL permitir selecionar entre as Moedas_Estrangeiras USD, EUR, GBP e ZAR.
3. WHEN o operador aciona o botão "Salvar Registro" com todos os campos obrigatórios preenchidos e válidos, THE Sistema SHALL persistir uma nova Venda no Armazenamento_Local e navegar de volta ao Dashboard.
4. WHEN uma Venda é persistida, THE Sistema SHALL atribuir a ela um identificador único no formato `TRX-<sequência>` e um _timestamp_ de criação baseado no relógio do dispositivo.
5. IF o campo "Nome do Cliente" está vazio ou contém apenas espaços em branco, THEN THE Registrador_de_Venda SHALL bloquear a submissão e exibir mensagem de validação referente ao campo.
6. IF o campo "Moeda" não tem valor selecionado, THEN THE Registrador_de_Venda SHALL bloquear a submissão e exibir mensagem de validação referente ao campo.
7. IF o campo "Quantidade Vendida" é menor ou igual a zero, vazio ou não numérico, THEN THE Registrador_de_Venda SHALL bloquear a submissão e exibir mensagem de validação referente ao campo.
8. IF o campo "Lucro Estimado (AOA)" é vazio ou não numérico, THEN THE Registrador_de_Venda SHALL bloquear a submissão e exibir mensagem de validação referente ao campo.
9. WHERE a opção "permitir lucro negativo" está desabilitada (padrão do sistema), IF o campo "Lucro Estimado (AOA)" é negativo, THEN THE Registrador_de_Venda SHALL bloquear a submissão e exibir mensagem de validação.
10. THE Registrador_de_Venda SHALL disponibilizar um botão "voltar" que retorna ao Dashboard sem persistir dados.

### Requisito 2: Exibir o Lucro Total em Kwanzas

**User Story:** Como operador, quero ver o lucro total acumulado em AOA no topo da Dashboard, para acompanhar o desempenho agregado da casa de câmbios.

#### Critérios de Aceitação

1. THE Dashboard SHALL exibir um card principal denominado "Lucro Total" com o valor em AOA.
2. THE Sistema SHALL calcular o Lucro_Total como a soma dos campos de lucro em AOA de todas as Vendas persistidas que não estejam marcadas como excluídas.
3. WHEN uma nova Venda é persistida, THE Dashboard SHALL refletir o novo Lucro_Total na próxima renderização sem exigir recarga manual da página.
4. WHEN o Histórico_de_Vendas está vazio, THE Dashboard SHALL exibir o Lucro_Total com valor `0` formatado conforme AOA.
5. THE Dashboard SHALL formatar o Lucro_Total utilizando o Formatador_de_Moeda configurado para AOA (separador de milhar, sem casas decimais fracionárias por padrão, sufixo "AOA").
6. WHERE existe dado suficiente para calcular variação percentual entre períodos, THE Dashboard SHALL exibir um indicador de variação percentual junto ao Lucro_Total.

### Requisito 3: Exibir o Histórico de Vendas

**User Story:** Como operador, quero ver a lista das vendas registradas em ordem cronológica, para consultar rapidamente as últimas operações.

#### Critérios de Aceitação

1. THE Dashboard SHALL exibir uma seção "Histórico de Vendas" logo abaixo do card de Lucro_Total.
2. THE Histórico_de_Vendas SHALL apresentar cada Venda contendo: nome do cliente, identificador da transação, valor vendido com símbolo da moeda estrangeira, e lucro em AOA.
3. THE Histórico_de_Vendas SHALL ordenar as Vendas por _timestamp_ de criação em ordem decrescente (mais recente primeiro).
4. WHEN duas Vendas possuem exatamente o mesmo _timestamp_, THE Histórico_de_Vendas SHALL desempatar pela ordem decrescente do identificador da transação.
5. WHEN o Histórico_de_Vendas está vazio, THE Dashboard SHALL exibir um estado vazio com mensagem orientando o operador a registrar a primeira venda.
6. THE Histórico_de_Vendas SHALL formatar o valor vendido utilizando o Formatador_de_Moeda apropriado para a Moeda_Estrangeira da Venda.
7. THE Histórico_de_Vendas SHALL formatar o lucro utilizando o Formatador_de_Moeda configurado para AOA, prefixado com o sinal "+" quando o valor é positivo.

### Requisito 4: Acesso rápido ao cadastro via FAB e navegação inferior

**User Story:** Como operador em uso mobile, quero um botão flutuante sempre acessível para registrar uma nova venda rapidamente, para não perder tempo navegando por menus.

#### Critérios de Aceitação

1. THE Dashboard SHALL exibir um FAB com ícone "+" fixado no canto inferior direito, acima da barra de navegação inferior.
2. WHEN o operador aciona o FAB, THE Sistema SHALL navegar para a tela Registrador_de_Venda.
3. THE Sistema SHALL exibir uma barra de navegação inferior com exatamente três itens, nesta ordem: "Dashboard", "Register" e "History".
4. WHILE o operador está na tela Dashboard, THE barra de navegação inferior SHALL destacar visualmente o item "Dashboard" como ativo conforme tokens do Design_System.
5. WHILE o operador está na tela Registrador_de_Venda, THE barra de navegação inferior SHALL destacar visualmente o item "Register" como ativo conforme tokens do Design_System.
6. WHILE o operador está na tela History, THE barra de navegação inferior SHALL destacar visualmente o item "History" como ativo conforme tokens do Design_System.
7. WHEN o operador aciona qualquer item da barra de navegação inferior, THE Sistema SHALL navegar para a tela correspondente sem recarregar a página.

### Requisito 5: Persistir Vendas localmente sem backend

**User Story:** Como operador, quero que minhas vendas fiquem salvas no próprio dispositivo mesmo sem internet e sem cadastro, para manter o app simples e soberano.

#### Critérios de Aceitação

1. THE Sistema SHALL persistir todas as Vendas no Armazenamento_Local do navegador do dispositivo.
2. THE Sistema SHALL operar sem qualquer comunicação com servidores remotos para leitura ou gravação de Vendas.
3. WHEN o operador recarrega o app ou o reabre após fechar, THE Sistema SHALL restaurar a lista completa de Vendas previamente persistidas a partir do Armazenamento_Local.
4. FOR ALL Vendas persistidas, a sequência _serializar → gravar → ler → desserializar_ SHALL produzir um objeto igual à Venda original em todos os seus campos (propriedade de _round-trip_ de persistência).
5. WHEN a mesma operação de gravação de uma Venda com identificador já existente é solicitada mais de uma vez, THE Sistema SHALL manter exatamente um registro correspondente àquele identificador no Armazenamento_Local (propriedade de idempotência por identificador).
6. IF o Armazenamento_Local atinge seu limite de quota durante uma gravação, THEN THE Sistema SHALL exibir mensagem de erro descritiva e NÃO remover Vendas previamente persistidas.

### Requisito 6: Instalar o app como PWA

**User Story:** Como operador, quero instalar o KwanzaProfit como um app no meu celular, para abri-lo como um aplicativo nativo a partir da tela inicial.

#### Critérios de Aceitação

1. THE Sistema SHALL disponibilizar um Manifesto_PWA válido contendo, no mínimo, `name`, `short_name`, `start_url`, `display` com valor `standalone`, `background_color`, `theme_color` e conjunto de `icons` com resoluções de 192×192 e 512×512.
2. THE Sistema SHALL registrar um Service_Worker no primeiro carregamento do app em um navegador compatível.
3. WHEN os critérios de instalabilidade do navegador são atendidos, THE Sistema SHALL permitir a instalação do app via prompt nativo do navegador.
4. THE theme_color e background_color do Manifesto_PWA SHALL corresponder aos tokens `surface` (`#101415`) e `primary` (`#4edea3`) do Design_System, respectivamente para background e theme.

### Requisito 7: Funcionamento offline

**User Story:** Como operador em campo ou com conexão instável, quero que o app continue funcionando sem internet, para registrar e consultar vendas a qualquer momento.

#### Critérios de Aceitação

1. THE Service_Worker SHALL cachear o _app shell_ (HTML, CSS, JavaScript, fontes auto-hospedadas e ícones) no primeiro carregamento bem-sucedido.
2. WHILE o dispositivo está offline, THE Sistema SHALL permitir ao operador abrir o app, navegar entre Dashboard, Registrador_de_Venda e History.
3. WHILE o dispositivo está offline, THE Sistema SHALL permitir ao operador registrar novas Vendas, persistindo-as no Armazenamento_Local.
4. WHILE o dispositivo está offline, THE Dashboard SHALL exibir o Lucro_Total e o Histórico_de_Vendas a partir exclusivamente do Armazenamento_Local.
5. WHEN o dispositivo volta a ficar online, THE Sistema SHALL continuar a operar normalmente sem exigir intervenção do operador.

### Requisito 8: Formatação monetária consistente

**User Story:** Como operador, quero ver os valores monetários formatados de forma clara e consistente por moeda, para ler rapidamente quantias grandes sem erros de interpretação.

#### Critérios de Aceitação

1. THE Formatador_de_Moeda SHALL formatar valores em AOA utilizando separador de milhar, sem casas decimais por padrão, com o sufixo " AOA".
2. THE Formatador_de_Moeda SHALL formatar valores em USD utilizando o símbolo "$" como prefixo e duas casas decimais.
3. THE Formatador_de_Moeda SHALL formatar valores em EUR utilizando o símbolo "€" como prefixo e duas casas decimais.
4. THE Formatador_de_Moeda SHALL formatar valores em GBP utilizando o símbolo "£" como prefixo e duas casas decimais.
5. THE Formatador_de_Moeda SHALL formatar valores em ZAR utilizando o prefixo "ZAR " e duas casas decimais.
6. FOR ALL valores numéricos finitos `v` e moedas suportadas `m`, a função `parse(format(v, m))` SHALL produzir um número cuja diferença absoluta em relação a `v` seja menor ou igual à precisão declarada para `m` (propriedade de _round-trip_ numérico do Formatador_de_Moeda).
7. THE Formatador_de_Moeda SHALL preservar o sinal do valor quando formatando quantias negativas, utilizando "-" como prefixo antes do símbolo da moeda.

### Requisito 9: Conformidade com o Design System

**User Story:** Como usuário do produto, quero uma interface visualmente consistente e elegante alinhada à identidade KwanzaProfit, para ter confiança no app.

#### Critérios de Aceitação

1. THE Sistema SHALL utilizar o tema _dark mode_ institucional com `background` `#101415` e `primary` `#4edea3` conforme definidos no Design_System.
2. THE Sistema SHALL utilizar a família tipográfica Inter para todos os textos da interface.
3. THE Sistema SHALL utilizar ícones da coleção Material Symbols Outlined para todos os ícones da interface.
4. THE Sistema SHALL aplicar `rounded-xl` (≈ 0.75rem) aos cards principais e `rounded-full` aos botões primários, conforme tokens do Design_System.
5. THE card principal de Lucro_Total SHALL aplicar efeito de glassmorphism com `backdrop-blur` e gradiente sutil conforme tela de referência do Dashboard.
6. THE Sistema SHALL ser _mobile-first_ e adaptar o layout a larguras a partir de 320px sem quebra de conteúdo.
7. WHEN a largura de viewport é maior ou igual a 768px, THE Sistema SHALL exibir navegação superior (desktop) e ocultar a barra de navegação inferior, conforme telas de referência.

### Requisito 10: Editar ou excluir uma Venda existente (opcional)

**User Story:** Como operador, quero corrigir ou remover uma venda registrada por engano, para manter o Lucro_Total correto.

#### Critérios de Aceitação

1. WHERE o recurso de edição de Vendas está habilitado, THE Histórico_de_Vendas SHALL permitir ao operador abrir uma Venda existente em modo de edição.
2. WHERE o recurso de edição de Vendas está habilitado, WHEN o operador salva alterações em uma Venda, THE Sistema SHALL atualizar o registro mantendo o mesmo identificador e atualizar o Lucro_Total na próxima renderização.
3. WHERE o recurso de exclusão de Vendas está habilitado, WHEN o operador confirma a exclusão de uma Venda, THE Sistema SHALL remover o registro do Armazenamento_Local e atualizar o Lucro_Total na próxima renderização.
4. WHERE o recurso de exclusão de Vendas está habilitado, THE Sistema SHALL solicitar confirmação explícita ao operador antes de remover qualquer Venda.

### Requisito 11: Filtrar e agrupar o Histórico de Vendas (opcional)

**User Story:** Como operador, quero filtrar o histórico por moeda e por período, para analisar o desempenho de operações específicas.

#### Critérios de Aceitação

1. WHERE o recurso de filtros está habilitado, THE Histórico_de_Vendas SHALL permitir filtrar as Vendas por Moeda_Estrangeira.
2. WHERE o recurso de filtros está habilitado, THE Histórico_de_Vendas SHALL permitir filtrar as Vendas por intervalo de datas de criação.
3. WHERE o recurso de filtros está habilitado, WHEN nenhum filtro está aplicado, THE Histórico_de_Vendas SHALL exibir todas as Vendas persistidas.
4. WHERE o recurso de filtros está habilitado, THE Dashboard SHALL recalcular o Lucro_Total considerando exclusivamente as Vendas que satisfazem os filtros ativos.
5. FOR ALL conjuntos de Vendas `S` e filtros `f`, `length(filter(S, f)) <= length(S)` SHALL ser verdadeiro (propriedade metamórfica de filtros não-ampliadores).

### Requisito 12: Propriedades de correção verificáveis por Property-Based Testing

**User Story:** Como responsável pela qualidade do KwanzaProfit, quero que as regras de negócio centrais sejam expressas como propriedades verificáveis, para detectar bugs em casos de borda automaticamente.

#### Critérios de Aceitação

1. FOR ALL listas `V` de Vendas válidas, `calcularLucroTotal(V)` SHALL ser igual à soma aritmética dos campos de lucro em AOA de todos os elementos de `V` (invariante de soma).
2. FOR ALL listas `V` de Vendas válidas e para qualquer permutação `V'` de `V`, `calcularLucroTotal(V)` SHALL ser igual a `calcularLucroTotal(V')` (propriedade de confluência: a ordem de inserção não afeta o Lucro_Total).
3. FOR ALL Vendas válidas `x` e listas de Vendas `V`, `calcularLucroTotal(V ∪ {x}) - calcularLucroTotal(V)` SHALL ser igual ao campo de lucro em AOA de `x` (propriedade metamórfica incremental).
4. FOR ALL listas `V` de Vendas válidas, `ordenar(ordenar(V))` SHALL ser igual a `ordenar(V)` (idempotência da ordenação do Histórico_de_Vendas).
5. FOR ALL listas `V` de Vendas válidas, `ordenar(V)` SHALL conter exatamente os mesmos elementos de `V`, preservando tamanho e conteúdo (invariante de preservação durante ordenação).
6. FOR ALL Vendas válidas `v`, `deserializar(serializar(v))` SHALL ser igual a `v` em todos os seus campos (_round-trip_ de serialização local).
7. FOR ALL entradas inválidas de formulário de Venda (campos obrigatórios ausentes, quantidade ≤ 0, lucro não numérico), THE Registrador_de_Venda SHALL sinalizar erro de validação e NÃO persistir a Venda (propriedade de _error conditions_).

## Itens em aberto para validação com o usuário

Os pontos abaixo foram inferidos a partir da descrição e dos mocks. Serão confirmados antes do Design:

- **Lucro negativo**: por padrão, o Requisito 1.9 bloqueia lucro negativo. Confirmar se deve ser permitido (ex.: prejuízo) ou não.
- **Variação percentual no card de Lucro_Total** (Requisito 2.6): o mock exibe `+8.4%`. Confirmar a janela de comparação (ex.: últimos 7 dias vs. 7 dias anteriores).
- **Moedas adicionais**: o conjunto inicial é {USD, EUR, GBP, ZAR}. Confirmar se o operador deve poder adicionar moedas customizadas.
- **Edição e exclusão (Requisito 10)** e **filtros (Requisito 11)**: marcados como `WHERE` (opcionais/configuráveis). Confirmar se entram no escopo da primeira versão ou ficam para versões futuras.
- **Casas decimais do AOA**: assumido zero casas decimais por padrão (Requisito 8.1). Confirmar se deve haver suporte a centavos.
