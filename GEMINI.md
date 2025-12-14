# Project Overview

This project is a web-based application for creating and managing customer orders for a company named "NV Diffusion". It's designed to be used by a salesperson to select a client, add articles to a shopping cart, and then generate an email with the order summary.

The application is built using plain HTML, CSS, and JavaScript, with no external libraries or frameworks. It loads data from three CSV files: `AnnuaireClients.csv`, `BaseArticleTarifs.csv`, and `StockRestant.csv`.

## Key Features

*   **Client Selection:** Filter clients by sector and search by name or code.
*   **Article Catalog:** Filter articles by family and search by code or designation.
*   **Dynamic Pricing:** Article prices are adjusted based on the selected client's tariff category.
*   **Shopping Cart:**
    *   Add, remove, and update article quantities.
    *   Displays total items in the cart (badge in header).
    *   Cart section is `sticky` for constant visibility.
    *   Visually distinguishes backordered items.
*   **Stock Management:** The application displays the stock status of each article and allows ordering of out-of-stock items.
*   **Delivery Date Selection:** Users can select a desired delivery date using increment/decrement buttons, with logic to skip weekends and prevent selecting past dates.
*   **Email Generation:** On checkout, the application generates a pre-filled email with the order summary.
    *   Customized subject line format.
    *   Enhanced email body including article count, total TTC, and selected delivery date.
    *   Increased character limit for article descriptions to prevent truncation.
*   **User Interface Enhancements:**
    *   Adjusted width for article quantity input fields.
    *   Dynamic adjustment for sticky table headers to prevent overlap with filter controls.
    *   Client search: Pressing 'Enter' automatically selects the first suggestion.

# Building and Running

This is a static web project. There is no build process. To run the application, you need to serve the files using a local web server.

**To start a local web server using Python:**

```bash
python3 -m http.server
```

Then, open your web browser and navigate to `http://localhost:8000`.

**Important:**

The application expects the CSV data files to be located in a directory named `BaseAppCmd`. You should ensure this directory exists in the root of the project and contains `AnnuaireClients.csv`, `BaseArticleTarifs.csv`, and `StockRestant.csv`.

# Development Conventions

*   **Code Style:** The JavaScript code is written in a procedural style. It uses global variables to store the application's state.
*   **File Naming:** The files are named using lowercase with underscores or camelCase.
*   **CSS:** The CSS is well-structured and uses comments to separate different sections of the stylesheet.
*   **Data:** The application relies on CSV files for its data. The data parsing logic is in the `script.js` file.
*   **Dependencies:** There are no external dependencies.
