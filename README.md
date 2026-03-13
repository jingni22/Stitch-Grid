# Stitch-Grid
*disclaimer: this app was vibe coded*

This is a Grid app specifically made for creating and editing knitting stitch charts.

## To run
Clone repo

`cd grid`

`npm run preview`

### Create Chart
There are pre made svg knitting symbols on the side bar under **DIR**.<br>
If symbol is unavailable, importing svgs is available under **EDIT**.<br>
Select cells where symbols will be placed and click symbol on side bar.

### Edit Chart

Selected cells containing symbols can be moved via **Edit** drop down menu on the top bar. <br>
Rows and Columns can be added to the grid via **Insert** drop down menu on the top bar.

### Knitting Mode

Knitting mode can be accessed from right side of the top bar. <br>
Keeps track of rows that have been knitting by striking through rows on the chart starting from the bottom row.

### Chart Reference

Image can be imported via **BG** button on the right side of the top bar. <br>
Image can be scaled and translated to match the grid lines of the view for easy referencing.

### Import/Export

Charts can be exported as png, svg, or JSON file that can be re imported back onto the grid to continue add/editing work.<br>
JSON file template can be filled manually and imported to the grid.<br>

*Potential to feed image and JSON file template to AI and it will generate JSON file that can imported to grid*
