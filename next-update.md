the actual is nearly good.
SAM return mask.
Free-form and polygon for manual.

Here are the next improvements :

- a special canva : for mask refinement - when select a mask we can go refine it
 - when this is active only this mask is visible 
 - and the mask should have a bunch of points (like what we have in polygone) to play with it in order to refine the mask. 
 - could be also able to add points at a desired mask border
 - also , a kind of eraser to refine the mask (as we now mask are just binary image so you can easily do it)
- a new tool named "Hole"/or find suitable name, permit to create an hole either in a polygon or in a mask.

Clarification : all of those is just to create a merged RLE binary mask for the object. we won't export or save polygones and free form in our database. Considere it as the step to create and refine Mask for each object.
It's why an object can contains Mask from SAM, polygone and free form.

By the way, add an export button , that will export all objects(objects are not single element like polygones, sam rle etc..) , object is a combinaison of those that will be merge to forme a single unified RLE mask.
the export should be COCO RLE format
