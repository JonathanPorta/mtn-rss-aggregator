#! /bin/sh

ARTICLE1=$1
ARTICLE2=$2

sort $ARTICLE1 > temp1
sort $ARTICLE2 > temp2

sed -i 's/^ *//; s/ *$//; /^$/d' temp1
sed -i 's/^ *//; s/ *$//; /^$/d' temp2

ARTICLE1LINES=`cat temp1 | wc -l `
ARTICLE2LINES=`cat temp2 | wc -l`

DIFFLINES=`sdiff -B -b -s temp1 temp2 | wc -l`

TOTAL=$(echo "$ARTICLE1LINES + $ARTICLE2LINES" | bc -l)
NOTCHANGED=$(echo "$TOTAL - $DIFFLINES" | bc -l)
PERCENT=$(echo "$NOTCHANGED / $TOTAL" | bc -l)

echo "a1: $ARTICLE1LINES"
echo "a2: $ARTICLE2LINES"
echo "total=$TOTAL"

echo "diff: $DIFFLINES"

echo "percent: $PERCENT"

