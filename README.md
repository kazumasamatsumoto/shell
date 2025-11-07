# Shell App - Angular Module Federation 技術検証

このプロジェクトはAngular v20とModule Federationを使用したマイクロフロントエンドの技術検証です。

## プロジェクト概要

- **Angular**: v20
- **Node.js**: v24.9.0
- **Module Federation**: @angular-architects/module-federation v20.0.0
- **スタイル**: SCSS

## アーキテクチャ

このプロジェクトは2つのAngularアプリケーションで構成されています：

1. **Shell App (localhost:4200)** - ホストアプリケーション
2. **Remote App (localhost:4201)** - リモートアプリケーション

Shell AppとRemote Appは独立してデプロイ可能で、ランタイムで動的に統合されます。

## 主な機能

### 1. ヘッダーコンポーネントの共有
Shell Appで作成したヘッダーコンポーネントをRemote Appで読み込んで使用します。

### 2. SPAとしてのシームレスなナビゲーション
すべてのページが`localhost:4200`で動作し、以下のルートが利用可能：
- `/home` - Shell Appのホームページ
- `/remote` - Remote Appのコンテンツ（動的読み込み）
- `/contact` - Shell Appのコンタクトページ

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発サーバーの起動

Shell AppとRemote Appの両方を起動する必要があります。

**Shell App (ポート4200):**
```bash
cd shell-app
npm start
```

**Remote App (別のターミナルで、ポート4201):**
```bash
cd remote-app
npm start
```

ブラウザで `http://localhost:4200` にアクセスしてください。

## Module Federationの設定

### Shell Appでコンポーネントを公開（expose）

```javascript
// webpack.config.js
module.exports = withModuleFederationPlugin({
  name: 'shell-app',
  
  exposes: {
    './Component': './src/app/app.ts',
    './Header': './src/app/components/header/header.ts',  // ヘッダーを公開
  },
  
  remotes: {
    'remote-app': 'http://localhost:4201/remoteEntry.js',  // Remote Appを参照
  },
  
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

### Remote Appでヘッダーを読み込む方法

#### 1. Webpack設定でShell Appを参照

```javascript
// remote-app/webpack.config.js
module.exports = withModuleFederationPlugin({
  name: 'remote-app',
  
  remotes: {
    'shell-app': 'http://localhost:4200/remoteEntry.js',  // Shell Appを参照
  },
  
  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
});
```

#### 2. コンポーネントで動的に読み込む

```typescript
// remote-app/src/app/app.ts
import { Component, OnInit, Type } from '@angular/core';
import { NgComponentOutlet, CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [NgComponentOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  headerComponent: Type<any> | null = null;

  async ngOnInit() {
    try {
      // @ts-ignore
      const module = await import('shell-app/Header');
      this.headerComponent = module.Header;
      console.log('Header component loaded successfully');
    } catch (error) {
      console.error('Error loading remote module:', error);
    }
  }
}
```

#### 3. テンプレートでレンダリング

```html
<!-- remote-app/src/app/app.html -->
<ng-container *ngIf="headerComponent" [ngComponentOutlet]="headerComponent"></ng-container>
<main>
  <!-- Remote Appのコンテンツ -->
</main>
```

## ルーティング設定

Shell Appでは、Remote Appのコンポーネントをルートとして動的に読み込みます：

```typescript
// shell-app/src/app/app.routes.ts
export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then(m => m.Home)
  },
  {
    path: 'remote',
    loadComponent: () => 
      // @ts-ignore
      import('remote-app/RemoteContent').then(m => m.RemoteContent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then(m => m.Contact)
  }
];
```

## Module Federationの仕組み

```
┌─────────────────────────────────────────────┐
│ Shell App (localhost:4200)                  │
│                                             │
│ webpack.config.js                           │
│ ├─ exposes:                                 │
│ │  └─ './Header' → header.component.ts     │
│ │                                           │
│ └─ remoteEntry.js を生成                    │
└─────────────────────────────────────────────┘
                    ↓
         remoteEntry.js を公開
                    ↓
┌─────────────────────────────────────────────┐
│ Remote App (localhost:4201)                 │
│                                             │
│ webpack.config.js                           │
│ ├─ remotes:                                 │
│ │  └─ 'shell-app': 'localhost:4200/...'    │
│ │                                           │
│ └─ import('shell-app/Header')               │
│    でヘッダーを動的に読み込み               │
└─────────────────────────────────────────────┘
```

## マイクロフロントエンドの利点

1. **独立したデプロイ** - 各アプリケーションを個別にデプロイ可能
2. **チーム間の並行開発** - 異なるチームが独立して開発可能
3. **技術スタックの柔軟性** - 部分的に異なる技術やバージョンを使用可能
4. **ランタイム統合** - ビルド時ではなくランタイムでコンポーネントを統合
5. **コードの共有** - 共通コンポーネントを複数のアプリで再利用

## 重要な注意点

### 1. 両方のアプリケーションを起動する必要がある
Remote Appがヘッダーを読み込むには、Shell Appの`remoteEntry.js`にアクセスできる必要があります。

### 2. 共有ライブラリの管理
```javascript
shared: {
  ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
}
```
- `singleton: true` - Angularなどの重要なライブラリは一つのインスタンスのみ
- これにより依存関係の競合を防ぐ

### 3. 本番環境でのURL設定
本番環境では、`remotes`の設定を適切なドメインに変更してください：

```javascript
remotes: {
  'remote-app': 'https://remote-app.example.com/remoteEntry.js',
}
```

## トラブルシューティング

### エラー: Cannot read properties of undefined (reading 'get')
- 両方のアプリケーションが起動していることを確認
- webpack.config.jsの`remotes`設定が正しいことを確認
- ブラウザのコンソールで詳細なエラーを確認

### コンポーネントが表示されない
- `remoteEntry.js`にアクセスできるか確認（`http://localhost:4200/remoteEntry.js`）
- webpack設定の`exposes`にコンポーネントが正しく設定されているか確認
- ブラウザのキャッシュをクリア（Ctrl+F5）

## ビルド

本番用ビルド：

```bash
npm run build
```

## 参考資料

- [Angular CLI](https://angular.dev/tools/cli)
- [Angular Architects - Module Federation](https://www.angulararchitects.io/en/aktuelles/the-microfrontend-revolution-module-federation-in-webpack-5/)
- [Module Federation公式ドキュメント](https://webpack.js.org/concepts/module-federation/)

## ライセンス

MIT
