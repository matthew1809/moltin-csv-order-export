## Export your moltin orders and their items to a CSV file

## Usage
1. Rename `.example.env` to `.env` and fill in the empty variables.
2. Create a folder called `csv` and a file within that folder called `orders.csv`.
3. Run `npm start` to begin the export.

## How it works
The script first checks whether there is anything in the `orders.csv` file already. If there is, we look at the last line, get the timestamp of that order, and begin fetching orders created in moltin after that date.

If there is nothing in the csv, we get orders from `01/01/2000` assuming that there will never be any orders created before that, since it's before the date the APi was created.

Once the script fetches a batch (100) of paid orders from the moltin API, it needs to match each order up with it's order items.

After matching each order with its items, the script sends the 100 orders to be added to the csv file.

This process is repeated as long as there are more pages of orders in moltin than have been fetched. If we have reached the point where there are no more orders, the script simply stops.

## Todo
- Write to google sheets instead
- Make deployable to a system which does not have fs access