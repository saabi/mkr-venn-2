/*

Creates a model of labels and circles from the data.

 */

import makeCircle from "./vendor/smallest-enclosing-circle";
import paper from 'paper';

function point(x, y) {
  return {x, y};
}

function allEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function haveSameGroups(members) {
  return members
    .map(m => m.groupIds)
    .reduce((acc, current) => {
      if (!acc) {
        return false;
      }
      if (allEqual(acc, current)) {
        return current;
      }
      return false;
    });
}

function label(point, members) {
  if (!haveSameGroups(members)) {
    throw 'All members in the label must have identical group ids';
  }
  return {
    members,
    groupIds: members[0].groupIds,
    x: point.x,
    y: point.y,
    // sets property "paperItem", which is what would be drawn with paper.js
    updatePaperItem() {
      if (!this.paperItem) {
        this.paperItem = new paper.PointText({
          content: this.members.map(m => m.name).join(','),
          fillColor: 'black',
          fontFamily: 'Courier New',
          fontWeight: 'bold',
          fontSize: 25
        });
      }
      this.paperItem.point = {x: this.x, y: this.y};
    },
    getVertices() {
      const rect = this.paperItem.bounds;
      return [rect.topLeft, rect.topRight, rect.bottomLeft, rect.bottomRight];
    },
    getCopy() {
      const copy = Object.assign({}, this, {paperItem: null});
      copy.updatePaperItem();
      return copy;
    }
  };
}

// Sunflower script adapted from https://stackoverflow.com/a/28572551
function getDistributedPoints(n, alpha) {
  const RAD = 250;

  function distance(k, n, b) {
    if (k > n - b) {
      return RAD;
    }
    return Math.sqrt(k - 1 / 2) / Math.sqrt(n - (b + 1) / 2);     // apply square root
  }

  const b = Math.round(alpha * Math.sqrt(n)); // number of boundary points
  const phi = (Math.sqrt(5) + 1) / 2;           // golden ratio
  let points = [];
  for (let k = 1; k <= n; k++) {
    let r = distance(k, n, b);
    let theta = 2 * Math.PI * k / Math.pow(phi, 2);
    points.push(point((r * RAD * Math.cos(theta)) + RAD, (r * RAD * Math.sin(theta)) + RAD));
  }
  return points;
}

function getModel({ groups, members }) {
  const model = {
    labels: [],
    circles: [],
    getCopy() {
      return Object.assign({}, this, {
        labels: this.labels.map(l => l.getCopy()),
        circles: this.circles.map(c => Object.assign({}, c))
      });
    },
    updateCircles() {
      model.labels.forEach(label => label.updatePaperItem());
      this.circles = groups.map(group => {
        const circle = Object.assign({}, group);
        // add members that belong to the group
        circle.labels = this.labels.filter(label => label.groupIds.some(id => id === group.id));
        // assign x, y and r
        const pointsInsideCircle = circle.labels
          .map(l => l.getVertices())
          .reduce((acc, current) => acc.concat(current));
        Object.assign(circle, makeCircle(pointsInsideCircle));
        circle.r += 5; // give some "padding" to the circle
        return circle;
      });
    }
  };
  let labels = [];
  members.forEach(member => {
    let sameRolesLabel = labels.find(label => allEqual(label.groupIds, member.groupIds));
    if (sameRolesLabel) {
      sameRolesLabel.members.push(member);
    } else {
      labels.push(label({}, [member]));
    }
  });

  const points = getDistributedPoints(labels.length, 0);
  model.labels = points.map((point, index) => Object.assign(labels[index], point));
  model.updateCircles();
  return model;
}

export default getModel;