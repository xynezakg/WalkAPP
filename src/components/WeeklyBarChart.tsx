import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { WeeklyDataPoint } from '../types';
import { formatNumber } from '../services/metricsCalculator';

interface WeeklyBarChartProps {
  data: WeeklyDataPoint[];
  goal: number;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({ data, goal }) => {
  const screenWidth = Dimensions.get('window').width - 48; // padding margins
  const chartHeight = 170;
  const paddingBottom = 26;
  const paddingTop = 20;
  const availableHeight = chartHeight - paddingBottom - paddingTop;

  const maxSteps = Math.max(...data.map((d) => d.steps), goal, 1000);
  const barWidth = 24;
  const spacing = (screenWidth - barWidth * data.length) / (data.length + 1);

  // Goal line Y position
  const goalRatio = Math.min(goal / maxSteps, 1);
  const goalY = paddingTop + availableHeight * (1 - goalRatio);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>This Week's Activity</Text>
        <Text style={styles.goalLabel}>Goal: {formatNumber(goal)}</Text>
      </View>

      <Svg width={screenWidth} height={chartHeight}>
        {/* Goal Dashed Line */}
        <Line
          x1={spacing / 2}
          y1={goalY}
          x2={screenWidth - spacing / 2}
          y2={goalY}
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {data.map((item, index) => {
          const x = spacing + index * (barWidth + spacing);
          const barHeightRatio = Math.min(item.steps / maxSteps, 1);
          const barHeight = Math.max(barHeightRatio * availableHeight, 4);
          const y = paddingTop + (availableHeight - barHeight);
          const isGoalMet = item.steps >= item.goal && item.steps > 0;

          // Bar colors
          let fillColor = '#CBD5E1'; // default gray
          if (item.isToday) {
            fillColor = isGoalMet ? '#10B981' : '#0284C7';
          } else if (isGoalMet) {
            fillColor = '#34D399';
          } else if (item.steps > 0) {
            fillColor = '#93C5FD';
          }

          return (
            <React.Fragment key={item.date}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={6}
                ry={6}
                fill={fillColor}
              />

              {/* Day Label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 6}
                fontSize="11"
                fontWeight={item.isToday ? 'bold' : 'normal'}
                fill={item.isToday ? '#0284C7' : '#64748B'}
                textAnchor="middle"
              >
                {item.dayLabel}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Goal Met</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#0284C7' }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#93C5FD' }]} />
          <Text style={styles.legendText}>In Progress</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
