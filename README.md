# 네이버 쇼핑 API를 통한 최저가 검색 Server
Node.js Express Framework로 구현한 쇼핑몰 웹서버

# 팀원
성결대학교 정보통신공학과 23-1 웹서버프로그래밍(목 7-9)

20190954 허진환

20190898 김태현

20190940 정재호

## Overview
 - Linux Cent OS 상에 Node.js 웹Server 생성 및 웹Server 구조 이해
 - 익스프레스 프레임워크 활용
 - Javascript 모듈/패키지 및 다양한 함수 활용
 - 클라이언트 – Server간 동작 이해
 - 네이버 쇼핑 API Server 이해 및 활용
 - MySQL을 통한 DBMS 구조 및 데이터베이스를 통한 데이터 관리 이해


## 웹서버 작동 방식

### 기본 서버-클라이언트 구조
서비스를 제공하는 Server와 Server에 서비스를 요청(request)하는 Client로 구성되어 있으며, Client의 요청(request)과 이에 Server가 요청(request)을 처리하고 응답(response)하는 형식으로 동작한다.

Server-Client 간 통신에서 포트번호는 서버 내에서 프로세스를 구분하는 번호로, 설정한 웹서버 포트에 따라 접속이 가능하다. 일반적으로 http 서버는 80번 포트를 사용하나(Well-known Port), 보안을 강화하기 위해 3000번 포트를 임의 지정하여 사용하였다.

![Server-Client Model](/img/block.png?raw=true "Title")

### 웹서버 - 데이터베이스서버 통신 방식
main.js를 통해 네이버 쇼핑으로부터 가져온 상품 데이터들을 알맞게 MySQL에서 테이블링하여 저장하고, Client 요청에 따라 알맞은 값을 데이터베이스로부터 반환

![Database](/img/dbblock.png)

### 순서도(Flowchart)

![flowchart](/img/flowchart.png)

## 데이터베이스 테이블 정보

### items 테이블

![items](/img/idb.png)

### users 테이블

![users](/img/udb.png)

### comments 테이블

![comments](/img/cdb.png)

### ratings 테이블

![ratings](/img/rdb.png)

## Output

![Output1](/img/commentandrating.png)

검색 예 (일렉기타)

![Output2](/img/itemsdb.png)

검색결과가 items 테이블에 저장

![Output3](/img/commentsdb.png)

검색결과가 comments 테이블에 저장


![Output4](/img/ratingdb.png)

검색 결과가 ratings 테이블에 저장

## Env

### Develop Env
VS Code

### Exec Env
![env](/img/executingincentos.png)
Linux Cent OS7, you need to install npm packages that exec needs (command : npm i ~~~)