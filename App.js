import { StatusBar } from 'expo-status-bar';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PanResponder,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const LANES = 3;
const BASE_SPEED = 3.2;
const OBSTACLE_SIZE = 70;
const SNOWMAN_SIZE = 90;
const JUMP_DURATION = 900; // milliseconds
const JUMP_HEIGHT = 120;

const computeJumpOffset = (remaining) => {
  if (remaining <= 0) {
    return 0;
  }
  const progress = 1 - remaining / JUMP_DURATION;
  return Math.sin(Math.PI * progress) * JUMP_HEIGHT;
};

const randomLane = () => Math.floor(Math.random() * LANES);

export default function App() {
  const { width, height } = useWindowDimensions();
  const fieldHeight = useMemo(() => Math.min(height * 0.7, 560), [height]);
  const laneWidth = useMemo(() => (width - 40) / LANES, [width]);
  const lanePositions = useMemo(() => {
    return Array.from({ length: LANES }, (_, idx) => 20 + idx * laneWidth + laneWidth / 2);
  }, [laneWidth]);
  const playerBaseline = fieldHeight - 30;

  const [playerLane, setPlayerLane] = useState(1);
  const [jumpClock, setJumpClock] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const playerLaneRef = useRef(playerLane);
  const jumpOffsetRef = useRef(0);
  const jumpingRef = useRef(false);
  const scoreRef = useRef(score);
  const spawnTimerRef = useRef(0);

  useEffect(() => {
    playerLaneRef.current = playerLane;
  }, [playerLane]);

  useEffect(() => {
    const offset = computeJumpOffset(jumpClock);
    jumpOffsetRef.current = offset;
    jumpingRef.current = jumpClock > 0;
  }, [jumpClock]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const triggerJump = useCallback(() => {
    setJumpClock((prev) => (prev > 0 ? prev : JUMP_DURATION));
  }, []);

  const moveLeft = useCallback(() => {
    setPlayerLane((lane) => Math.max(0, lane - 1));
  }, []);

  const moveRight = useCallback(() => {
    setPlayerLane((lane) => Math.min(LANES - 1, lane + 1));
  }, []);

  const handleCollision = useCallback(() => {
    setIsGameOver(true);
    setHighScore((prev) => Math.max(prev, scoreRef.current));
  }, []);

  const resetGame = useCallback(() => {
    setPlayerLane(1);
    setJumpClock(0);
    setObstacles([]);
    setScore(0);
    spawnTimerRef.current = 0;
    setIsGameOver(false);
  }, []);

  useEffect(() => {
    if (isGameOver) {
      return () => {};
    }

    let animationId;
    let lastTime = Date.now();

    const update = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;
      const frameScalar = delta / (1000 / 60);

      setJumpClock((prev) => Math.max(0, prev - delta));

      setObstacles((prev) => {
        let collided = false;
        let cleared = 0;
        const updated = [];
        const playerX = lanePositions[playerLaneRef.current];
        const playerBottom = playerBaseline - jumpOffsetRef.current;
        const playerTop = playerBottom - SNOWMAN_SIZE;
        const verticalSpeed = (BASE_SPEED + scoreRef.current * 0.08) * frameScalar;

        prev.forEach((obs) => {
          const newY = obs.y + verticalSpeed;
          if (newY > fieldHeight + OBSTACLE_SIZE) {
            cleared += 1;
            return;
          }

          if (!jumpingRef.current && obs.lane === playerLaneRef.current) {
            const obsBottom = newY + OBSTACLE_SIZE;
            const horizontalDistance = Math.abs(playerX - obs.x);
            const overlappingX = horizontalDistance < laneWidth * 0.35;
            const overlappingY = obsBottom > playerTop + 10 && newY < playerBottom - 10;
            if (overlappingX && overlappingY) {
              collided = true;
              return;
            }
          }

          updated.push({ ...obs, y: newY });
        });

        if (cleared) {
          setScore((prevScore) => prevScore + cleared);
        }

        if (collided) {
          handleCollision();
          return [];
        }

        spawnTimerRef.current += delta;
        const spawnInterval = Math.max(250, 900 - scoreRef.current * 25);
        if (spawnTimerRef.current >= spawnInterval) {
          spawnTimerRef.current = 0;
          const laneIndex = randomLane();
          updated.push({
            id: `${Date.now()}-${Math.random()}`,
            lane: laneIndex,
            x: lanePositions[laneIndex],
            y: -OBSTACLE_SIZE - 20,
          });
        }

        return updated;
      });

      animationId = requestAnimationFrame(update);
    };

    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [fieldHeight, handleCollision, isGameOver, lanePositions, playerBaseline]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20 || Math.abs(gesture.dy) > 20,
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
          if (gesture.dx > 25) {
            moveRight();
          } else if (gesture.dx < -25) {
            moveLeft();
          }
        } else if (gesture.dy < -25) {
          triggerJump();
        }
      },
    }),
  [moveLeft, moveRight, triggerJump]);

  const jumpOffset = useMemo(() => computeJumpOffset(jumpClock), [jumpClock]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <Text style={styles.title}>ICE Run</Text>
      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>Score: <Text style={styles.scoreValue}>{score}</Text></Text>
        <Text style={styles.scoreLabel}>Best: <Text style={styles.scoreValue}>{highScore}</Text></Text>
      </View>

      <View
        style={[styles.playfield, { height: fieldHeight }]}
        {...panResponder.panHandlers}
      >
        {Array.from({ length: LANES }, (_, idx) => (
          <View
            key={`lane-${idx}`}
            style={[
              styles.laneDivider,
              {
                left: 20 + idx * laneWidth,
                height: fieldHeight,
              },
            ]}
          />
        ))}

        {obstacles.map((obs) => (
          <View
            key={obs.id}
            style={[
              styles.ice,
              {
                width: OBSTACLE_SIZE,
                height: OBSTACLE_SIZE,
                left: obs.x - OBSTACLE_SIZE / 2,
                top: obs.y,
              },
            ]}
          >
            <Text style={styles.iceLabel}>ICE</Text>
          </View>
        ))}

        <View
          style={[
            styles.snowman,
            {
              width: SNOWMAN_SIZE,
              height: SNOWMAN_SIZE,
              left: lanePositions[playerLane] - SNOWMAN_SIZE / 2,
              top: playerBaseline - SNOWMAN_SIZE - jumpOffset,
            },
          ]}
        >
          <View style={styles.snowmanBody}>
            <View style={styles.snowmanFace}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.carrot} />
            <View style={styles.buttons}>
              <View style={styles.buttonDot} />
              <View style={styles.buttonDot} />
              <View style={styles.buttonDot} />
            </View>
          </View>
        </View>

        {isGameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>Frozen!</Text>
            <Text style={styles.overlaySubtitle}>ICE caught you. Tap restart.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={resetGame}>
              <Text style={styles.primaryButtonLabel}>Restart</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={moveLeft}>
          <Text style={styles.controlLabel}>Left</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={triggerJump}>
          <Text style={styles.controlLabel}>Jump</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={moveRight}>
          <Text style={styles.controlLabel}>Right</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Swipe left/right to change lanes or swipe up to jump.</Text>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: '#021224',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    color: '#f3f7ff',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  scoreLabel: {
    color: '#d7e4ff',
    fontSize: 16,
  },
  scoreValue: {
    fontWeight: '700',
  },
  playfield: {
    backgroundColor: '#042a4f',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  laneDivider: {
    position: 'absolute',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  snowman: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowmanBody: {
    backgroundColor: '#fefefe',
    width: '100%',
    height: '100%',
    borderRadius: 45,
    borderColor: '#b6d4f7',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowmanFace: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '60%',
    marginBottom: 6,
  },
  eye: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0b1f3a',
  },
  carrot: {
    width: 30,
    height: 6,
    backgroundColor: '#ff8a00',
    borderRadius: 3,
    marginBottom: 8,
  },
  buttons: {
    alignItems: 'center',
    gap: 6,
  },
  buttonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0b1f3a',
  },
  ice: {
    position: 'absolute',
    backgroundColor: '#7dd3fc',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  iceLabel: {
    color: '#01213a',
    fontWeight: '800',
    fontSize: 16,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 18, 36, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlayTitle: {
    color: '#fefefe',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  overlaySubtitle: {
    color: '#cbd5f5',
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    color: '#021224',
    fontSize: 18,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#0f4c81',
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 16,
  },
  controlLabel: {
    color: '#e0f2ff',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: '#9dbfe8',
    textAlign: 'center',
    marginTop: 12,
  },
};
