/* Copyright (c) 2002-2012 Croteam Ltd. 
This program is free software; you can redistribute it and/or modify
it under the terms of version 2 of the GNU General Public License as published by
the Free Software Foundation


This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along
with this program; if not, write to the Free Software Foundation, Inc.,
51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

336

%{
  #include "StdH.h"
  #include "Models/Enemies/Beast/Beast.h"
  #include "Entities/WorldSettingsController.h"
  #include "Entities/BackgroundViewer.h"
%}

uses "Entities/EnemyBase";
uses "Entities/BasicEffects";

enum BeastType {
  0 BT_NORMAL         "Small [0]",      // normal (fighter)
  1 BT_BIG            "Big [1]",        // big
  2 BT_HUGE           "Huge [2]",       // huge
};

%{
  static FLOAT _tmLastStandingAnim =0.0f;  
  #define BEAST_STRETCH 2.0f
  #define BIG_BEAST_STRETCH 12.0f
  #define HUGE_BEAST_STRETCH 30.0f
  
  #define BIG_BEAST_CANNONBALL_RESISTANCE 0.3333F
  #define HUGE_BEAST_CANNONBALL_RESISTANCE 0.5F    // [SSE] Balance Change. Default=0.3333F
  
  #define MELEE_DAMAGE_NORMAL 40.0F
  #define MELEE_DAMAGE_BIG 80.0F
  #define MELEE_DAMAGE_HUGE 120.0F

  // info structure
  static EntityInfo eiBeastHuge = {
    EIBT_FLESH, 10000.0f,
    0.0f, 2.0f*HUGE_BEAST_STRETCH, 0.0f,     // source (eyes)
    0.0f, 1.5f*HUGE_BEAST_STRETCH, 0.0f,     // target (body)
  };

  static EntityInfo eiBeastNormal = {
    EIBT_FLESH, 1500.0f,
    0.0f, 2.0f*BEAST_STRETCH, 0.0f,     // source (eyes)
    0.0f, 1.5f*BEAST_STRETCH, 0.0f,     // target (body)
  };

  static EntityInfo eiBeastBig = {
    EIBT_FLESH, 5000.0f,
    0.0f, 2.0f*BIG_BEAST_STRETCH, 0.0f,     // source (eyes)
    0.0f, 1.5f*BIG_BEAST_STRETCH, 0.0f,     // target (body)
  };
%}

class CBeast : CEnemyBase {
name      "Beast";
thumbnail "Thumbnails\\Beast.tbn";

properties:
  1 enum BeastType m_bcType     "Character" 'C' = BT_NORMAL,
  2 INDEX m_iCounter = 0,
  //3 BOOL m_bBeBoss  "Boss" 'B' = FALSE, // Don not use property with ID 3 in CBeast!

components:

  0 class   CLASS_BASE          "Classes\\EnemyBase.ecl",
  1 class   CLASS_PROJECTILE    "Classes\\Projectile.ecl",
  2 class   CLASS_BASIC_EFFECT  "Classes\\BasicEffect.ecl",

 10 model   MODEL_BEAST           "Models\\Enemies\\Beast\\Beast.mdl",
 11 texture TEXTURE_BEAST_NORMAL  "Models\\Enemies\\Beast\\Beast.tex",
 12 texture TEXTURE_BEAST_BIG     "Models\\Enemies\\Beast\\BeastBig.tex",
 13 texture TEXTURE_BEAST_HUGE    "ModelsMP\\Enemies\\Beast\\BeastBiggest.tex",

// ************** SOUNDS **************
 50 sound   SOUND_IDLE      "Models\\Enemies\\Beast\\Sounds\\Idle.wav",
 51 sound   SOUND_SIGHT     "Models\\Enemies\\Beast\\Sounds\\Sight.wav",
 52 sound   SOUND_WOUND     "Models\\Enemies\\Beast\\Sounds\\Wound.wav",
 53 sound   SOUND_FIRE      "Models\\Enemies\\Beast\\Sounds\\Fire.wav",
 54 sound   SOUND_KICK      "Models\\Enemies\\Beast\\Sounds\\Kick.wav",
 55 sound   SOUND_DEATH     "Models\\Enemies\\Beast\\Sounds\\Death.wav",
 56 sound   SOUND_DEATHBIG  "Models\\Enemies\\Beast\\Sounds\\DeathBig.wav",
 57 sound   SOUND_ANGER     "Models\\Enemies\\Beast\\Sounds\\Anger.wav",

functions:

  // --------------------------------------------------------------------------------------
  // Precache entity components.
  // --------------------------------------------------------------------------------------
  void Precache(void)
  {
    CEnemyBase::Precache();
    PrecacheSound(SOUND_IDLE );
    PrecacheSound(SOUND_SIGHT);
    PrecacheSound(SOUND_WOUND);
    PrecacheSound(SOUND_ANGER);
    PrecacheSound(SOUND_FIRE);
    PrecacheSound(SOUND_KICK);

    PrecacheModel(MODEL_BEAST);
    PrecacheTexture(TEXTURE_BEAST_NORMAL);
    PrecacheTexture(TEXTURE_BEAST_BIG);

    if (m_bcType == BT_NORMAL) {
      PrecacheSound(SOUND_DEATH);
      PrecacheClass(CLASS_PROJECTILE, PRT_BEAST_PROJECTILE);
    } else {
      PrecacheSound(SOUND_DEATHBIG);
      PrecacheClass(CLASS_PROJECTILE, PRT_BEAST_BIG_PROJECTILE);
    }
  };

  // --------------------------------------------------------------------------------------
  // Describe how this enemy killed player.
  // --------------------------------------------------------------------------------------
  virtual CTString GetPlayerKillDescription(const CTString &strPlayerName, const EDeath &eDeath)
  {
    CTString str;
    str.PrintF(TRANS("A Reptiloid killed %s"), strPlayerName);

    return str;
  }

  // --------------------------------------------------------------------------------------
  // Returns path to computer message with enemy description.
  // --------------------------------------------------------------------------------------
  virtual const CTFileName &GetComputerMessageName(void) const
  {
    static DECLARE_CTFILENAME(fnmNormal, "Data\\Messages\\Enemies\\BeastNormal.txt");
    static DECLARE_CTFILENAME(fnmBig, "Data\\Messages\\Enemies\\BeastBig.txt");
    static DECLARE_CTFILENAME(fnmHuge, "DataMP\\Messages\\Enemies\\BeastBiggest.txt");

    switch (m_bcType)
    {
      case BT_NORMAL: return fnmNormal;
      case BT_BIG: return fnmBig;
      case BT_HUGE: return fnmHuge;
      default: ASSERT(FALSE);
    }
    
    return fnmNormal;
  };

  // --------------------------------------------------------------------------------------
  /* Entity info */
  // --------------------------------------------------------------------------------------
  void *GetEntityInfo(void)
  {
    if (m_bcType == BT_NORMAL) {
      return &eiBeastNormal;
    } else if (m_bcType == BT_HUGE) {
      return &eiBeastHuge;
    } else {
      return &eiBeastBig;
    }
  };

  // --------------------------------------------------------------------------------------
  // Starts an earthquake.
  // --------------------------------------------------------------------------------------
  void ShakeItBaby(FLOAT tmShaketime, FLOAT fPower)
  {
    CWorldSettingsController *pwsc = GetWSC(this);

    if (pwsc != NULL)
    {
      pwsc->m_tmShakeStarted = tmShaketime;
      pwsc->m_vShakePos = GetPlacement().pl_PositionVector;
      pwsc->m_fShakeFalloff = 400.0f;
      pwsc->m_fShakeFade = 3.0f;

      pwsc->m_fShakeIntensityZ = 0.0f;
      pwsc->m_tmShakeFrequencyZ = 5.0f;
      pwsc->m_fShakeIntensityY = 0.1f*fPower;
      pwsc->m_tmShakeFrequencyY = 5.0f;
      pwsc->m_fShakeIntensityB = 2.5f*fPower;
      pwsc->m_tmShakeFrequencyB = 7.2f;

      pwsc->m_bShakeFadeIn = FALSE;
    }
  }

  // --------------------------------------------------------------------------------------
  // Returns maximum health of object which will be crushed on touch.
  // --------------------------------------------------------------------------------------
  FLOAT GetCrushHealth(void)
  {
    if (m_bcType == BT_BIG) {
      return 100.0f;
    } else if (m_bcType == BT_HUGE) {
      return 200.0f;
    }

    return 0.0f;
  }

  // --------------------------------------------------------------------------------------
  // Causes cannonballs explode when touching them.
  // --------------------------------------------------------------------------------------
  BOOL ForcesCannonballToExplode(void)
  {
    return TRUE;
  }

  // --------------------------------------------------------------------------------------
  /* Receive damage */
  // --------------------------------------------------------------------------------------
  void ReceiveDamage(CEntity *penInflictor, enum DamageType dmtType,
    FLOAT fDamageAmmount, const FLOAT3D &vHitPoint, const FLOAT3D &vDirection) 
  {
    // Take less damage from heavy bullets (e.g. sniper).
    if (dmtType == DMT_BULLET && fDamageAmmount > 100.0f)
    {
      fDamageAmmount *= 0.5f;
    }

    // Cannonballs inflict less damage then the default.
    if (dmtType == DMT_CANNONBALL)
    {
      if (m_bcType == BT_BIG) {
        fDamageAmmount *= BIG_BEAST_CANNONBALL_RESISTANCE;
      } else if (m_bcType == BT_HUGE) {
        fDamageAmmount *= HUGE_BEAST_CANNONBALL_RESISTANCE;
      }
    }

    // Can't harm own class.
    if (!IsOfClass(penInflictor, "Beast")) {
      CEnemyBase::ReceiveDamage(penInflictor, dmtType, fDamageAmmount, vHitPoint, vDirection);
    }
  };

  // --------------------------------------------------------------------------------------
  // Returns damage animation index and starts animation.
  // --------------------------------------------------------------------------------------
  INDEX AnimForDamage(FLOAT fDamage)
  {
    INDEX iAnim;

    if ((m_bcType == BT_BIG || m_bcType == BT_HUGE) && GetHealth() <= m_fMaxHealth/2) {
      iAnim = BEAST_ANIM_ANGER;
    } else {
      iAnim = BEAST_ANIM_WOUND;
    }

    StartModelAnim(iAnim, 0);

    return iAnim;
  };

  // --------------------------------------------------------------------------------------
  // Returns death animation index and starts animation.
  // --------------------------------------------------------------------------------------
  INDEX AnimForDeath(void)
  {
    INDEX iAnim;

    if (m_bcType == BT_BIG || m_bcType == BT_HUGE) {
      iAnim = BEAST_ANIM_DEATHBIG;
    } else {
      iAnim = BEAST_ANIM_DEATH;
    }

    StartModelAnim(iAnim, 0);

    return iAnim;
  };

  // --------------------------------------------------------------------------------------
  // Returns time needed to wait before starting the dust effect.
  // --------------------------------------------------------------------------------------
  FLOAT WaitForDust(FLOAT3D &vStretch)
  {
    if (GetModelObject()->GetAnim() == BEAST_ANIM_DEATH)
    {
      vStretch=FLOAT3D(1,1,2)*2.0f;
      return 0.3f;
    }

    return -1.0f;
  };

  void DeathNotify(void)
  {
    ChangeCollisionBoxIndexWhenPossible(BEAST_COLLISION_BOX_DEATH);
    en_fDensity = 500.0f;
  };

  // virtual anim functions
  void StandingAnim(void)
  {
    _tmLastStandingAnim = _pTimer->CurrentTick();
    StartModelAnim(BEAST_ANIM_IDLE, AOF_LOOPING|AOF_NORESTART);
  };

  void WalkingAnim(void)
  {
    if (_pTimer->CurrentTick()>=_tmLastStandingAnim-_pTimer->TickQuantum &&
       _pTimer->CurrentTick()<=_tmLastStandingAnim+_pTimer->TickQuantum)
    {
      //BREAKPOINT;
    }

    if (m_bcType==BT_BIG || m_bcType==BT_HUGE) {
      StartModelAnim(BEAST_ANIM_WALKBIG, AOF_LOOPING|AOF_NORESTART);
    } else {
      StartModelAnim(BEAST_ANIM_WALK, AOF_LOOPING|AOF_NORESTART);
    }
  };

  void RunningAnim(void) {
    WalkingAnim();
  };

  void RotatingAnim(void) {
    WalkingAnim();
  };

  // virtual sound functions
  void IdleSound(void) {
    PlaySound(m_soSound, SOUND_IDLE, SOF_3D);
  };

  void SightSound(void) {
    PlaySound(m_soSound, SOUND_SIGHT, SOF_3D);
  };

  void WoundSound(void)
  {
    if ((m_bcType == BT_BIG || m_bcType == BT_HUGE) && GetHealth() <= m_fMaxHealth/2) {
      PlaySound(m_soSound, SOUND_ANGER, SOF_3D);
    } else {
      PlaySound(m_soSound, SOUND_WOUND, SOF_3D);
    }
  };

  void DeathSound(void)
  {
    if (m_bcType == BT_NORMAL) {
      PlaySound(m_soSound, SOUND_DEATH, SOF_3D);
    } else {
      PlaySound(m_soSound, SOUND_DEATHBIG, SOF_3D);
    }
  };

  // --------------------------------------------------------------------------------------
  // Adjust sound and watcher parameters here if needed.
  // --------------------------------------------------------------------------------------
  void EnemyPostInit(void) 
  {
    m_soSound.Set3DParameters(160.0f, 50.0f, 2.0f, 1.0f);
  };

procedures:
/************************************************************
 *                    D  E  A  T  H                         *
 ************************************************************/
  // --------------------------------------------------------------------------------------
  // The death sequence.
  // --------------------------------------------------------------------------------------
  Death(EVoid) : CEnemyBase::Death
  {
    if (m_bcType == BT_NORMAL) {
      jump CEnemyBase::Death();
    }
    
    // stop moving
    StopMoving();
    DeathSound();     // death sound
    LeaveStain(TRUE);

    // set physic flags
    SetPhysicsFlags(EPF_MODEL_CORPSE);
    SetCollisionFlags(ECF_CORPSE);
    SetFlags(GetFlags() | ENF_SEETHROUGH);

    // stop making fuss
    RemoveFromFuss();

    // death notify (usually change collision box and change body density)
    DeathNotify();

    // start death anim
    AnimForDeath();
    autowait(0.9f);

    if (m_bcType == BT_BIG) {
      ShakeItBaby(_pTimer->CurrentTick(), 2.0f);
    } else {
      ShakeItBaby(_pTimer->CurrentTick(), 3.0f);
    }

    autowait(2.3f-0.9f);

    if (m_bcType == BT_BIG) {
      ShakeItBaby(_pTimer->CurrentTick(), 5.0f);
    } else {
      ShakeItBaby(_pTimer->CurrentTick(), 7.0f);
    }

    // spawn dust effect
    CPlacement3D plFX=GetPlacement();
    ESpawnEffect ese;
    ese.colMuliplier = C_WHITE|CT_OPAQUE;
    ese.vStretch = FLOAT3D(1,1,2)*15.0f;
    ese.vNormal = FLOAT3D(0,1,0);
    ese.betType = BET_DUST_FALL;
    CPlacement3D plSmoke=plFX;
    plSmoke.pl_PositionVector+=FLOAT3D(0,0.35f*ese.vStretch(2),0);
    CEntityPointer penFX = CreateEntity(plSmoke, CLASS_BASIC_EFFECT);
    penFX->Initialize(ese);

    autowait(GetModelObject()->GetAnimLength(BEAST_ANIM_DEATHBIG)-2.3f);

    return EEnd();
  };

/************************************************************
 *                A T T A C K   E N E M Y                   *
 ************************************************************/
  // --------------------------------------------------------------------------------------
  // Shoot into enemy.
  // --------------------------------------------------------------------------------------
  Fire(EVoid) : CEnemyBase::Fire
  {
    // wait to finish walk and smooth change to idle
    StartModelAnim(BEAST_ANIM_WALKTOIDLE, AOF_SMOOTHCHANGE);
    autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    

    if (m_bcType == BT_NORMAL)
    {
      StartModelAnim(BEAST_ANIM_ATTACK, AOF_SMOOTHCHANGE);
      autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;

      // [SSE] Enemy Settings Entity - Silent
      if (!IsSilent()) {
        PlaySound(m_soSound, SOUND_FIRE, SOF_3D);
      }

      autowait(0.51f);

      ShootProjectile(PRT_BEAST_PROJECTILE, FLOAT3D(0.0f, 1.5f * BEAST_STRETCH * ClampDn(m_fStretchMultiplier, 0.3F), 0.0f), // [SSE] Better Enemy Stretching
        ANGLE3D(AngleDeg((FRnd()-0.5)*30.0f), AngleDeg(FRnd()*10.0f), 0));
      autowait(0.3f);
    }
    
    if (m_bcType == BT_BIG)
    {
      if (GetHealth() <= m_fMaxHealth/2)
      {
        m_iCounter = 0;

        while (m_iCounter < 6)
        {
          StartModelAnim(BEAST_ANIM_ATTACKFAST, AOF_SMOOTHCHANGE);
          autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    

          // [SSE] Enemy Settings Entity - Silent
          if (!IsSilent()) {
            PlaySound(m_soSound, SOUND_FIRE, SOF_3D);
          }

          autowait(0.34f);
          ShootProjectile(PRT_BEAST_BIG_PROJECTILE, FLOAT3D( 0.0f, 1.5f * BIG_BEAST_STRETCH * ClampDn(m_fStretchMultiplier, 0.1F), 0.0f), // [SSE] Better Enemy Stretching
            ANGLE3D(0.0f, 0.0f, 0.0f));
            //ANGLE3D( AngleDeg(40.0f*Cos(m_iCounter*360.0/6.0f)), AngleDeg(20.0f*Sin(m_iCounter*180.0/6.0f)), 0));
          //autowait(0.15f);
          m_iCounter++;
        }

        m_fAttackFireTime = 7.0f;
      }
      
      if (GetHealth() > m_fMaxHealth/2)
      {
        m_iCounter = 0;

        while (m_iCounter < 3)
        {
          StartModelAnim(BEAST_ANIM_ATTACK, AOF_SMOOTHCHANGE);
          autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    

          // [SSE] Enemy Settings Entity - Silent
          if (!IsSilent()) {
            PlaySound(m_soSound, SOUND_FIRE, SOF_3D);
          }

          autowait(0.5f);
          ShootProjectile(PRT_BEAST_BIG_PROJECTILE, FLOAT3D( 0.0f, 1.5f * BIG_BEAST_STRETCH * ClampDn(m_fStretchMultiplier, 0.1F), 0.0f), // [SSE] Better Enemy Stretching
            ANGLE3D(0.0f, 0.0f, 0.0f));
            //ANGLE3D( AngleDeg(20.0f*Cos(m_iCounter*360.0/3.0f)), AngleDeg(10.0f*Sin(m_iCounter*180.0/3.0f)), 0));
            //ANGLE3D( FRnd()*20.0f-10.0f, FRnd()*10.0f-5.0f, 0));
          //autowait(0.25f);
          m_iCounter++;
        }
      }
    }

    if (m_bcType == BT_HUGE)
    {
      if (GetHealth() <= m_fMaxHealth/2)
      {
        m_iCounter = 0;

        while ( m_iCounter<6)
        {
          StartModelAnim(BEAST_ANIM_ATTACKFAST, AOF_SMOOTHCHANGE);
          autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    

          // [SSE] Enemy Settings Entity - Silent
          if (!IsSilent()) {
            PlaySound(m_soSound, SOUND_FIRE, SOF_3D);
          }

          autowait(0.34f);
          ShootProjectile(PRT_BEAST_BIG_PROJECTILE, FLOAT3D( 0.0f, 1.5f * HUGE_BEAST_STRETCH * ClampDn(m_fStretchMultiplier, 0.05F), 0.0f), // [SSE] Better Enemy Stretching
            ANGLE3D(0.0f, 0.0f, 0.0f));
            //ANGLE3D( AngleDeg(40.0f*Cos(m_iCounter*360.0/6.0f)), AngleDeg(20.0f*Sin(m_iCounter*180.0/6.0f)), 0));
          //autowait(0.15f);
          m_iCounter++;
        }

        m_fAttackFireTime = 7.0f;
      }
      
      if (GetHealth() > m_fMaxHealth/2)
      {
        m_iCounter = 0;

        while (m_iCounter < 3)
        {
          StartModelAnim(BEAST_ANIM_ATTACK, AOF_SMOOTHCHANGE);
          autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    

          // [SSE] Enemy Settings Entity - Silent
          if (!IsSilent()) {
            PlaySound(m_soSound, SOUND_FIRE, SOF_3D);
          }

          autowait(0.5f);
          ShootProjectile(PRT_BEAST_BIG_PROJECTILE, FLOAT3D( 0.0f, 1.5f * HUGE_BEAST_STRETCH * ClampDn(m_fStretchMultiplier, 0.05F), 0.0f), // [SSE] Better Enemy Stretching
            ANGLE3D(0.0f, 0.0f, 0.0f));
            //ANGLE3D( AngleDeg(20.0f*Cos(m_iCounter*360.0/3.0f)), AngleDeg(10.0f*Sin(m_iCounter*180.0/3.0f)), 0));
            //ANGLE3D( FRnd()*20.0f-10.0f, FRnd()*10.0f-5.0f, 0));
          //autowait(0.25f);
          m_iCounter++;
        }
      }
    }

    MaybeSwitchToAnotherPlayer();

    autowait(FRnd()/2 + _pTimer->TickQuantum); 

    if (m_penEnemy != NULL)
    {
      FLOAT fEnemyDistance = CalcDist(m_penEnemy);

      if (fEnemyDistance>m_fCloseDistance*1.25f)
      {
        StartModelAnim(BEAST_ANIM_IDLETOWALK, AOF_SMOOTHCHANGE);
        autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    
        autowait(GetModelObject()->GetAnimLength(BEAST_ANIM_IDLETOWALK)/2.0f - _pTimer->TickQuantum); 
      }
    }

    return EReturn();
  };

  // --------------------------------------------------------------------------------------
  // Hit the enemy.
  // --------------------------------------------------------------------------------------
  Hit(EVoid) : CEnemyBase::Hit
  {
    // close attack
    StartModelAnim(BEAST_ANIM_KICK, 0);
    autowait(0.45f);

    /*
    StartModelAnim(BEAST_ANIM_KICK, AOF_SMOOTHCHANGE);
    autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    
    */

    // [SSE] Enemy Settings Entity - Silent
    if (!IsSilent()) {
      PlaySound(m_soSound, SOUND_KICK, SOF_3D);
    }

    if (CalcDist(m_penEnemy) < m_fCloseDistance)
    {
      FLOAT3D vDirection = m_penEnemy->GetPlacement().pl_PositionVector-GetPlacement().pl_PositionVector;
      vDirection.Normalize();
      if (m_bcType == BT_BIG) {
        InflictDirectDamage(m_penEnemy, this, DMT_CLOSERANGE, MELEE_DAMAGE_BIG, FLOAT3D(0, 0, 0), vDirection);
      } else if (m_bcType == BT_HUGE) {
        InflictDirectDamage(m_penEnemy, this, DMT_CLOSERANGE, MELEE_DAMAGE_HUGE, FLOAT3D(0, 0, 0), vDirection);
      } else  {
        InflictDirectDamage(m_penEnemy, this, DMT_CLOSERANGE, MELEE_DAMAGE_NORMAL, FLOAT3D(0, 0, 0), vDirection);
      }
    }

    /*
    StartModelAnim(BEAST_ANIM_IDLE, AOF_SMOOTHCHANGE);
    autocall CMovableModelEntity::WaitUntilScheduledAnimStarts() EReturn;    
    */

    autowait(0.45f);
    MaybeSwitchToAnotherPlayer();

    return EReturn();
  };

  // --------------------------------------------------------------------------------------
  // The entry point.
  // --------------------------------------------------------------------------------------
  Main(EVoid)
  {
    // declare yourself as a model
    InitAsModel();
    SetPhysicsFlags(EPF_MODEL_WALKING);
    SetCollisionFlags(ECF_MODEL);
    SetFlags(GetFlags()|ENF_ALIVE);

    en_fDensity = 1100.0f;

    // set your appearance
    SetModel(MODEL_BEAST);
    StandingAnim();

    // Setup moving speed.
    m_fWalkSpeed = FRnd()*2 + 5.0f;
    m_aWalkRotateSpeed = AngleDeg(FRnd()*20.0f + 50.0f);
    m_fCloseRunSpeed = FRnd() + 10.0f;
    m_aCloseRotateSpeed = AngleDeg(FRnd()*100 + 900.0f);

    // Setup attack distances.
    m_fAttackDistance = 500.0f;
    m_fCloseDistance = 0.0f;
    m_fStopDistance = 0.0f;
    m_fCloseFireTime = 1.0f;
    m_fIgnoreRange = 750.0f;
    m_fStopDistance = 5.0f;
    m_fCloseDistance = 7.0f;
    m_tmGiveUp = Max(m_tmGiveUp, 10.0f);

    // Damage/Explode properties.
    if (m_bcType == BT_NORMAL)
    {
      m_fAttackRunSpeed = 6.0f;//6
      m_aAttackRotateSpeed = AngleDeg(3600.0f);
      SetHealth(400.0f);
      SetModelMainTexture(TEXTURE_BEAST_NORMAL);
      m_fBlowUpAmount = 10000.0f;
      m_fBodyParts = 4;
      m_fDamageWounded = 250.0f;
      m_iScore = 5000; // 500

      // set stretch factor
      GetModelObject()->StretchModel(FLOAT3D(BEAST_STRETCH, BEAST_STRETCH, BEAST_STRETCH));
      ModelChangeNotify();
      m_sptType = SPT_SLIME;
      m_fAttackFireTime = 3.0f;

    } else if (m_bcType == BT_BIG) {
      m_fAttackRunSpeed = 25.0f;//8
      m_aAttackRotateSpeed = AngleDeg(600.0f);
      SetHealth(3000.0f); // 500
      SetModelMainTexture(TEXTURE_BEAST_BIG);
      m_fBlowUpAmount = 10000.0f; // 500
      m_fBodyParts = 6;
      m_fDamageWounded = 650.0f; // 500
      m_iScore = 25000; // 1000
      m_fStopDistance = 15;
      m_fCloseDistance = 20;

      // Set stretch factor.
      GetModelObject()->StretchModel(FLOAT3D(BIG_BEAST_STRETCH, BIG_BEAST_STRETCH, BIG_BEAST_STRETCH));
      ModelChangeNotify();
      m_sptType = SPT_BLOOD;
      m_fAttackFireTime = 5.0f;

    } else { // HUGE
      m_fAttackRunSpeed = 35.0f;//8
      m_aAttackRotateSpeed = AngleDeg(600.0f);
      SetHealth(6000.0f); // 500
      SetModelMainTexture(TEXTURE_BEAST_HUGE);
      m_fBlowUpAmount = 100000.0f; // 500
      m_fBodyParts = 6;
      m_fDamageWounded = 1650.0f; // 500
      m_iScore = 40000; // 1000
      m_fStopDistance = 75;
      m_fCloseDistance = 80;
      m_fAttackDistance = 1000.0f;
      m_fIgnoreRange = 1200.0f;

      // Set stretch factor.
      GetModelObject()->StretchModel(FLOAT3D(HUGE_BEAST_STRETCH, HUGE_BEAST_STRETCH, HUGE_BEAST_STRETCH));
      ModelChangeNotify();
      m_sptType = SPT_BLOOD;
      m_fAttackFireTime = 5.0f;
    }
    
    m_fMaxHealth = GetHealth();

    // Continue behavior in base class.
    jump CEnemyBase::MainLoop();
  };
};