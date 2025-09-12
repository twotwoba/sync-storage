# sync-storage

A chrome extension for synchronize different domains's localStorage/sessionStorage.

## When to use

If your frontend project is part of a company system architecture with a unified login portal, you may need `sync-storage` to synchronize authentication credentials from the login portal to your local development environment.

## Get started


1. **Install dependencies**

    ```bash
    pnpm install
    ```

2. **Start development**

    ```bash
    pnpm dev
    ```

3. **Load extension in Chrome**

    - Open Chrome and navigate to `chrome://extensions/`
    - Enable "Developer mode" in the top right
    - Click "Load unpacked"
    - Select the `dist` folder from your project

4. **Build for production**
    ```bash
    pnpm build
    ```

**_I'm very happy to see you submit a PR to make it better._**

## Screen shot


## License

This repository is licensed under the [MIT](LICENSE)
