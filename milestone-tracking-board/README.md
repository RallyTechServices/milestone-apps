#Milestone Tracking Board
Shows the User Stories, Defects and lowest level portfolio items associated with the selected milestone.  

![ScreenShot](/images/milestone-tracking-board.png)

At the top level of the tree grid, only items explicitly associated with the selected milestone will be shown at the top level of the tree grid.
The children for each item will also be shown regardless of whether or not they are explicitly associated with the milestone.  

###Late Stories
Late stories are milestone user stories or defects that are either not scheduled into an iteration or are scheduled into an iteration with an end date beyond the milestone Target Date. 

###Banner
The data included in the banner calculations include work items that meet the following criteria:
* Leaf user stories (no children) explicitly associated with the milestone
* Defects explicitly associated with the milestone
* Defects directly associated with a User Story that is associated explicitly with the milestone (even though the defect may not be explicitly associated with the milestone)
* Test Cases directly associated with a User Story this is associated explicitly with the milestone 

Note that User Stories that are decendents of a Feature or Parent User Story explicitly associated with the Milestone are **NOT** included in the banner rollup calculations.  The User story must be EXPLICITLY associated with the Milestone.  

###Accepted Points
Sum of all plan estimates from the dataset above (excluding test cases) where the schedule state is Accepted or greater.

###Estimated Work Items
Number of all work items from the dataset above (excluding Test Cases) where the PlanEstimate is not null.  This includes work items that have a Plan Estimate = 0

###Accepted Count
Number of all work items from the dataset above (excluding test cases) where the Schedule State is Accepted or greater.

###Active Defects
Number of Defects from the above dataset where the State != Closed

###Test Cases Passed
Number of Test Cases from the above dataset where the Last Verdict = Passed

###Defect Density
Total Number of Defects – Cancelled defects)/ Total Number of Test Cases Executed.  Cancelled defect states are defined in the App settings.


###App Configuration

![ScreenShot](/images/milestone-tracking-board-settings.png)

Inactive Defect States - determines which defect states are not considered "Active"
Cancelled Defect States - Used in the calculation of Defect Density
Include Derived User Stories - If checked, the banner calculations will include user stories that are not associated explicitly with the milestone, but children of a feature explicitly associated with the milestone.  

Cumulative Flow chart on the banner is calculated using the same work items included in the banner calculations and history is shown for these items, not for the milestone.  Thus
the cumulative flow chart does not show scope change in the milestone.  