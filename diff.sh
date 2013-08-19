#! /bin/sh

CWD=$3
ARTICLE1="$CWD$1"
ARTICLE2="$CWD$2"
ARTICLE1TEMP="$ARTICLE1.temp"
ARTICLE2TEMP="$ARTICLE2.temp"
HASH=$4

sort -u $ARTICLE1 > $ARTICLE1TEMP
sort -u $ARTICLE2 > $ARTICLE2TEMP

sed -i 's/^ *//; s/ *$//; /^$/d' $ARTICLE1TEMP
sed -i 's/^ *//; s/ *$//; /^$/d' $ARTICLE2TEMP

ARTICLE1LINES=`cat $ARTICLE1TEMP | wc -l `
ARTICLE2LINES=`cat $ARTICLE2TEMP | wc -l`

DIFFLINES=`sdiff -B -b -s $ARTICLE1TEMP $ARTICLE2TEMP | wc -l`

TOTAL=$(echo "$ARTICLE1LINES + $ARTICLE2LINES" | bc -l)
NOTCHANGED=$(echo "$TOTAL - $DIFFLINES" | bc -l)
PERCENT=$(echo "$NOTCHANGED / $TOTAL" | bc -l)

#echo "a1: $ARTICLE1LINES"
#echo "a2: $ARTICLE2LINES"
#echo "total=$TOTAL"

#echo "diff: $DIFFLINES"

#echo "{'$HASH' : '$PERCENT'}"
echo $PERCENT
