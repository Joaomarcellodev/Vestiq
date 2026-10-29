# ACCEPTANCE — Avaliação de transação concluída

## AC-REV-001-01 — Avaliar após concluir

**Dado** uma negociação concluída entre a loja A (vendedora) e a loja B (compradora)
**Quando** a loja B escolhe 5 estrelas, escreve um comentário e envia
**Então** a avaliação é registrada para a loja A
**E** a página mostra "Sua avaliação de A" no lugar do formulário.

## AC-REV-001-02 — Pedido entregue

**Dado** um pedido de abastecimento entregue
**Quando** a revendedora ou a fábrica avalia a outra parte
**Então** a avaliação é registrada para a outra parte.

## AC-REV-001-03 — Uma vez só e só quem participou

**Dado** que a loja B já avaliou a negociação
**Quando** ela tenta avaliar de novo
**Então** vê "Você já avaliou esta transação"
**E** uma loja que não participou não consegue avaliar.

## AC-REV-001-04 — Só concluída

**Dado** uma negociação pendente, aceita, recusada ou cancelada
**Então** não há formulário de avaliação e o banco recusa a avaliação.

## AC-REV-002-01 — Ver as duas avaliações

**Dado** que as duas partes avaliaram
**Quando** qualquer uma abre a transação
**Então** vê a avaliação que fez e a que recebeu.

## AC-REV-003-01 — Nota no perfil público

**Dado** uma loja com avaliações 4 e 5
**Quando** outra revendedora da rede abre o perfil dela
**Então** vê "4,5 (2 avaliações)"; sem avaliações, vê "Ainda sem avaliações".

## AC-REV-003-02 — Ninguém altera a avaliação

**Dado** uma avaliação registrada
**Quando** qualquer usuário tenta inserir, editar ou apagar linhas de `reviews` direto pela API
**Então** a operação não tem efeito (RLS).
