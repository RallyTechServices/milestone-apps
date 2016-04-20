#Milestone Tracking Board (version 2)
Shows the User Stories, Defects and lowest level portfolio items associated with the selected milestone.  

![ScreenShot](/images/milestone-tracking-board-v2.png)

At the top level of the tree grid, only items explicitly associated with the selected milestone will be shown at the top level of the tree grid.
The children for each item will also be shown regardless of whether or not they are explicitly associated with the milestone.  

###Late Stories
Late stories are milestone user stories or defects that are either not scheduled into an iteration or are scheduled into an iteration with an end date beyond the milestone Target Date. 

###Banner
The data included in the banner calculations include work items that meet the following criteria:
* User stories explicitly associated with the milestone
* Defects explicitly associated with the milestone
* Defects directly associated with a User Story that is associated explicitly with the milestone (even though the defect may not be explicitly associated with the milestone)
* Test Cases directly associated with a User Story this is associated explicitly with the milestone 

Note that User Stories that are decendents of a Feature or Parent User Story explicitly associated with the Milestone are **NOT** included in the banner rollup calculations.  The User story must be EXPLICITLY associated with the Milestone.  

###Accepted Count
Number of all User Stories (excludes defects and testcases) from the dataset above where the Schedule State is Accepted or greater.

###Accepted Points
Sum of all plan estimates from User Stories with no children (excludes defects and testcases) where the schedule state is Accepted or greater.

###Test Coverage
The percent of user stories (includes parent user stories) that have at least 1 test case associated with them.  

###Test Cases Executed
Number of Test Cases associated with a User Story that is associated with the milestone.  In order to be considered as "executed" a test case must meet the following criteria:
(1) Each TestCaseResults must have at least 1 Attachment
(2) LastRun date must be less than or equal to the selected Milestone Target Date

###UAT Test Cases Executed
Number of Test Cases where the Type = "Acceptance" that are associated with a User Story that is associated with the milestone.  In order to be considered as "executed" a test case must meet the following criteria:
(1) Each TestCaseResults must have at least 1 Attachment
(2) LastRun date must be less than or equal to the selected Milestone Target Date
Note that in the grid, if a Test Case has a last verdict but does not meet the above criteria, it will be flagged and not counted in the stats banner.  

###Closed Defects
Number of Defects associated with the Milestone (Either directly or via a User Story associated with the Milestone) that 
have a Resolution in the list of included Resolutions (as configured in the App Settings) and that 
are in a state considered "Closed" (as configured in the App Settings)

###App Configuration

![ScreenShot](/images/milestone-tracking-board-v2-settings.png)

Closed Defect States - determines which defect states are considered "Closed".  Defaults to "Closed"
Exclude Defects with Resolution - determines which defects are excluded from the defect data set.  Defaults to None. 
Show Test Case Result Attachments - If selected, will show the number of TestCaseResults with at least 1 Attachment for the TestCase in the format of "2/3" meaning "2 of 3 TestCaseResults has at least 1 attachment".

 
