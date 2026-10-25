# Blockonomics — Economia Minecraft

Aplicação web em português para planejar preços e comparar a rentabilidade de atividades de um servidor de Minecraft. O repositório começou vazio; esta implementação usa **React 19, TypeScript e Vite**, com componentes reutilizáveis e cálculos independentes da interface. Essa stack permite executar o programa sem banco de dados ou credenciais, gerar uma aplicação estática e testar as regras econômicas isoladamente.

**Todos os preços, taxas, probabilidades, saldos e rendimentos iniciais são demonstrativos.** Nenhum valor foi consultado de um servidor Minecraft. Substitua as hipóteses pelas medições e regras do seu servidor antes de tomar decisões.

## Instalação e execução

Recomendado: Node.js 22 ou superior e npm. O ambiente de desenvolvimento foi preparado com Node.js 24.

```bash
cd /workspace/economia
npm ci
npm run dev
```

O Vite informa a porta do servidor de desenvolvimento. Para gerar e inspecionar a versão de produção:

```bash
npm run build
npm run preview
```

O diretório `dist/` pode ser servido por qualquer hospedagem de arquivos estáticos. A aplicação não precisa de variáveis de ambiente nem de autenticação.

## Estrutura dos módulos

```text
src/
  main.tsx                    Entrada React
  App.tsx                     Navegação e estado compartilhado
  styles.css                  Layout responsivo e componentes visuais
  components/
    Dashboard.tsx             Indicadores, projeções e visão econômica
    PriceCatalog.tsx          Catálogo, preços e comparações
    Simulator.tsx             Formulários e resultados dos simuladores
    AnalysisViews.tsx         Investimentos, cenários, relatórios e configurações
    Shared.tsx                Indicadores, paginação e estados vazios
  domain/
    types.ts                  Tipos de dados e categorias
    economics.ts              Fonte única das fórmulas econômicas
    economics.test.ts         Testes de cálculo e entradas inválidas
    catalog.ts                Pesquisa, ordenação e paginação
    catalog.test.ts           Testes de catálogo e conjuntos grandes
  data/
    demo.ts                   Catálogo e hipóteses de demonstração
  lib/
    storage.ts                Persistência e validação de dados
    storage.test.ts           Testes de backup e armazenamento
    format.ts                 Formatação numérica e exportação CSV
e2e/                          Testes de interação no navegador
```

As regras de negócio ficam em `domain/`, sem depender de React. Os componentes recebem o mesmo estado `AppData`; editar um preço ou parâmetro atualiza os módulos que o utilizam. A persistência é separada das fórmulas.

## Funcionalidades

- Dashboard com patrimônio configurado, saldo, receitas, custos, lucro líquido, lucro por hora e projeções estimadas.
- Catálogo inicial de **129 itens** e **12 atividades**, distribuídos entre mineração, plantações, pesca, spawners e outras atividades.
- Preços atuais e planejados editáveis, diferenças absolutas e percentuais, categorias e inclusão de novos itens.
- Pesquisa sem distinção de acentos, filtros, ordenação, paginação e escolha da quantidade de registros por página. Os totais consideram todo o conjunto filtrado, incluindo outras páginas.
- Simuladores com investimento, tempo do ciclo, tentativas, quantidade de drops, probabilidade, eficiência, tempo produtivo, custos fixos e variáveis e taxa de venda. Ferramentas, encantamentos e observações podem documentar as hipóteses.
- Saídas múltiplas por atividade para considerar categorias de captura e drops, com probabilidades exclusivas ou independentes.
- Comparação entre preços atuais e planejados e análise qualitativa dos incentivos à produção, oferta e demanda.
- Cenários conservador, provável e otimista com multiplicadores editáveis de produtividade, preços e custos.
- Investimentos com payback simples, ROI operacional e projeções para 24 horas de operação, 7 dias e 30 dias.
- Relatório de rentabilidade com ranking, margens e totais.
- Configurações de moeda, saldo, ativos e horas de operação por dia.
- Persistência local, exportação de tabelas e relatórios em CSV e backup/importação JSON validada.

## Uso recomendado

1. Em **Configurações**, informe saldo, valor dos ativos, símbolo da moeda e rotina diária. O patrimônio soma saldo e ativos; não é um extrato de transações.
2. No **Catálogo de preços**, ajuste os preços atuais e planejados por unidade. Use filtros e pesquisa para localizar um recurso.
3. No simulador da atividade, configure os rendimentos medidos, o ciclo completo e os custos. Inclua reparos, combustível, insumos e replantio quando aplicáveis.
4. Para atividades com vários resultados, configure as probabilidades e quantidades de cada saída. Uma sessão de pesca deve considerar as categorias dentro de uma única atividade para não duplicar os custos da mesma sessão.
5. Compare cenários e investimentos. Observe o tempo disponível: uma pessoa não realiza todas as atividades simultaneamente.
6. Exporte um CSV para análise externa e um backup JSON antes de restaurar a demonstração ou trocar de dispositivo.

## Fórmulas e hipóteses

Todas as fórmulas operacionais são centralizadas em `src/domain/economics.ts`.

Considere:

| Símbolo                     | Significado                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `T`                         | Duração do ciclo completo, em segundos                                 |
| `f`                         | Fração do tempo efetivamente produtivo, de 0 a 1                       |
| `U`                         | Unidades por ciclo: área plantada ou quantidade de spawners (padrão 1) |
| `A`                         | Tentativas por unidade/ciclo: colheitas por bloco ou mobs por spawner  |
| `e`                         | Eficiência de coleta/abate, de 0 a 1                                   |
| `pᵢ`                        | Probabilidade de uma saída, de 0 a 1                                   |
| `qᵢ`                        | Quantidade média da saída quando ela ocorre                            |
| `vᵢ`                        | Preço atual ou planejado por unidade da saída                          |
| `mProd`, `mPreço`, `mCusto` | Multiplicadores do cenário                                             |
| `cCiclo`, `cHora`           | Custo por ciclo e custo fixo por hora                                  |
| `tVenda`                    | Taxa de venda, de 0 a 1                                                |
| `I`                         | Investimento inicial                                                   |

```text
ciclos por hora = (3600 / T) × f
tentativas efetivas por hora = ciclos por hora × U × A × e × mProd
drops médios por tentativa = soma(pᵢ × qᵢ)
drops por hora = tentativas efetivas por hora × soma(pᵢ × qᵢ)
valor esperado por tentativa = soma(pᵢ × qᵢ × vᵢ × mPreço)
receita bruta por hora = tentativas efetivas por hora × valor esperado por tentativa
custos por hora = (ciclos por hora × cCiclo + cHora) × mCusto
                  + receita bruta por hora × tVenda
lucro líquido por hora = receita bruta por hora − custos por hora
payback em horas = I / lucro líquido por hora, quando lucro > 0
ROI operacional por hora (%) = lucro líquido por hora / I × 100, quando I > 0
lucro em N dias = lucro líquido por hora × horas por dia × N
```

Em atividades de saída única, são usados `dropProbability`, `dropsPerAttempt` e o item principal. Quando existem saídas múltiplas, elas substituem esse rendimento simples; o modelo não conta as duas representações juntas. No modo **exclusivo**, a soma das probabilidades não pode superar 100%; a diferença pode representar tentativas sem saída. No modo **independente**, cada drop tem sua probabilidade e várias saídas podem ocorrer na mesma tentativa.

O custo por ciclo acompanha o número de ciclos, independentemente do sucesso da tentativa. O custo fixo por hora incide também sobre o tempo improdutivo. O multiplicador de produtividade altera o rendimento, não a frequência dos ciclos; seus custos por ciclo permanecem os mesmos. O multiplicador de custos não altera o investimento inicial nem a taxa percentual de venda.

A ferramenta e os encantamentos são **descrições**, sem bônus automático. Configure seus efeitos nos parâmetros de tempo, probabilidade, quantidade e eficiência. Evite contar Fortuna ou Pilhagem novamente se já estiverem incluídos no rendimento médio. Para spawners, configure separadamente a quantidade de spawners e os mobs gerados por spawner/ciclo; para plantações, a área plantada e as colheitas por bloco/ciclo.

As projeções de **24 horas operacionais** usam 24 horas de operação. As projeções de **7 e 30 dias** respeitam a configuração de horas por dia, de 0 a 24. O lucro projetado não desconta o investimento inicial: para obter o resultado acumulado após o capital investido, subtraia `I`. Com lucro zero ou negativo, o payback é apresentado como **sem retorno**. Com investimento zero, o ROI percentual não possui base; uma atividade lucrativa pode ter payback de zero horas.

### Exemplo verificável

Uma atividade com ciclo de 60 segundos, fração produtiva de 80%, 10 tentativas por ciclo, eficiência de 90%, probabilidade de 50%, 2 drops por acerto e preço de 10 moedas produz:

```text
48 ciclos/h × 10 tentativas × 90% × 50% × 2 drops = 432 drops/h
receita = 432 × 10 = 4.320 moedas/h
custos = (48 × 2 moedas/ciclo + 10 moedas/h) + 5% × 4.320 = 322 moedas/h
lucro = 4.320 − 322 = 3.998 moedas/h
payback para investimento de 10.000 moedas ≈ 2,50 horas
```

Neste exemplo, todos os multiplicadores de cenário são 1 e a quantidade de unidades é 1. As médias de drops e receita por ciclo também aparecem no simulador; elas representam um ciclo executado, mesmo quando a fração produtiva da sessão é zero.

### Comparação de preços e totais

```text
diferença absoluta = preço planejado − preço atual
variação (%) = diferença absoluta / preço atual × 100, quando preço atual > 0
```

Com preço atual zero, a variação percentual não tem base definida. A cesta de comparação soma **uma unidade de cada item filtrado**: é um índice ilustrativo sem ponderação por volume, sem histórico e sem medir a inflação real. Os totais dos relatórios somam atividades em operação simultânea; não representam uma única pessoa alternando entre elas. Para essa rotina, calcule uma média ponderada pelo tempo destinado a cada atividade.

## Persistência e exportação

O estado é armazenado no `localStorage`, em um envelope versionado, sob a chave `economia.minecraft.v1`. Não há transmissão para um serviço externo. O navegador pode bloquear esse armazenamento ou apagá-lo ao limpar dados; o modo privado também pode limitar a persistência.

O backup JSON contém itens, atividades, cenários e configurações. A importação valida tipos, intervalos, referências de itens e cenários e IDs duplicados antes de substituir os dados. Arquivos acima de 5 MB são recusados pela interface. Um arquivo salvo diretamente em `localStorage` que esteja corrompido ou seja incompatível não é executado; a aplicação retorna aos exemplos seguros.

Os CSVs usam separador `;`, cabeçalhos em português e codificação UTF-8 com BOM para facilitar a abertura em planilhas. A exportação do catálogo inclui todos os registros filtrados, não apenas a página visível. O CSV é para análise; a restauração completa utiliza o backup JSON.

## Testes e validação

```bash
npm test
npm run build
```

Os testes unitários com Vitest cobrem as fórmulas, cenários, probabilidades, investimento zero, custos superiores à receita, entradas negativas/não finitas, dados ausentes, comparações com preço inicial zero, ordenação, filtros, paginação de conjuntos grandes e validação/persistência dos dados.

Para os testes de interação com Playwright, a configuração reutiliza `/usr/bin/chromium` quando disponível (como neste ambiente). Você pode definir `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para outro executável. Em máquinas sem navegador instalado, instale o Chromium de teste uma vez:

```bash
npx playwright install chromium
npm run test:e2e
```

Se o sistema informar bibliotecas nativas ausentes, use o procedimento oficial do Playwright para a sua distribuição. Em uma máquina com permissão para instalar pacotes do sistema, `npx playwright install --with-deps chromium` instala o navegador e essas bibliotecas. A configuração dos testes inicia o servidor local automaticamente. Os testes exercitam navegação, alteração dos parâmetros, filtros/paginação e persistência. Para acompanhar os testes unitários durante o desenvolvimento, use `npm run test:watch`.

Verificações manuais úteis:

1. Altere um preço planejado e confirme o resultado correspondente nos simuladores, no comparador e no relatório.
2. Aumente o custo acima da receita e confirme o lucro negativo e a ausência de payback.
3. Coloque probabilidade, eficiência ou horas diárias em zero e confirme resultados sem divisões inválidas.
4. Filtre vários itens, troque de página e verifique que os totais do filtro não mudam.
5. Exporte um backup, altere os dados, importe o arquivo e confirme a restauração.

## Limitações e decisões ajustáveis

- Não há backend, login, contas de jogadores, colaboração em tempo real ou sincronização entre dispositivos.
- Não existe integração automática com plugins, APIs ou arquivos de um servidor Minecraft. Importar configurações requer o formato JSON da aplicação.
- Não há previsão real de inflação, oferta, demanda, elasticidade, comportamento dos jogadores ou equilíbrio monetário. As observações do comparador são qualitativas.
- O modelo calcula valores esperados, sem sorteio Monte Carlo, intervalos de confiança, risco de perda de itens ou limites automáticos de estoque, chunks, ticks, entidades e AFK.
- As mecânicas variam por edição, versão e plugins. Crescimento, encantamentos, taxas de spawn e probabilidades precisam ser ajustados pelo usuário; a ferramenta não garante taxas vanilla.
- Custos de fabricação e replantio são informados manualmente, sem atualização recursiva automática de receitas quando o preço de um insumo muda.
- Saldo e patrimônio são configurações estáticas, sem livro-caixa e sem série histórica real. Projeções não contabilizam juros, tributos externos, depreciação patrimonial ou mudanças futuras de preço.
- Exportações e backups são locais. Guarde uma cópia fora do navegador se os dados forem importantes.

Para adaptar o programa, comece pelos tipos de `domain/types.ts`, pelos exemplos de `data/demo.ts` e pelos parâmetros editáveis na interface. Novas regras econômicas devem entrar em `domain/economics.ts` acompanhadas de testes, para manter dashboard e simuladores consistentes.
