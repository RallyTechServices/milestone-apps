#Milestone Metrics

App modeled after the Track > Release Metrics page.  

When a milestone is selected, this app shows all iterations associated with work items in that milestone.  

![ScreenShot](/images/milestone-metrics.png)

###Dataset
The data included in this app is the following:
* Any User Stories or Defects EXPLICITLY associated with the milestone.  If a User Story is a child of a Feature or User Story associated with the milestone, but the User Story is not, then the user story will not be represented in this app. 
* Any Defects associated with a User Story that is explicitly associated with the selected milestone.  
* Any Test Cases associated with a User Story or Defect that is explicitly associated with the selected milestone.  

**EXCEPTION:**
* If storiesOnlyForAccepted is ticked in the settings panel, then the total counts/points, accepted counts/points, and percentages will only count user stories and the header of the column will change.

####Dataset Notes:
* If a Defect or a Test Case is associated with a User Story, and does not have an iteration explicitly assigned to it, then it will be aggregated into the iteration that its parent work product is in.  
* If a Defect or a Test Case is associated with a User Story, and has a different iteration than the user story, then it will be aggregated into its explicity iteration, not the iteration of the user story.  
* If a milestone's work items are not within the selected project scope, they will not be included in the data in this app.  

###Metrics
* **Total Work Item Count** - the total number of work items from the dataset above associated with the iteration
* **Accepted Work Item Count** - the total number of accepted (or higher) work items from the dataset above assocaited with the iteration
* **% Accepted** - the sum of points for Accepted (or higher) work items divided by the total number of points for the iteration
* **Accepted Points** - the sum of points for Accepted (or higher) work items
* **Remaining Points** - the sum of total points - the sum of accepted points for the iteration
* **Total Points** - the sum of the total points for the iteration
* **% Planned Velocity** - is the total points for the work products from the above data set in the iteration divided by the Planned Velocity for the iteration.  
* **Passed Tests** - the number of test cases that have a Last Verdict = "Passed" for the iteration as defined in the dataset above
* **Total Tests** - the total number of test cases for the iteration as defined in the dataset above
* **Active Defects** - the number of defects for the iteration as defined in the dataset above that are not in an inactive State. The inactive states can be configured in the App Settings.  The default inactive states is the "Closed" state.
* **Total Defects** - the total number of defects for the iteration as defined in the dataset above

Inactive States configuration in the App Settings:
![ScreenShot](/images/milestone-metrics-configuration.png)
