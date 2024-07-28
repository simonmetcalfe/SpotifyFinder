
  var vPlNamesTable;
  var vPlTracksTable;
  var vLastPlSelectionCntrTracksTab = 0;
  var vTracksTabLoading = false;
  var vPlTracksTableLastSearchCol = '';
  var vPlNameTableLastSelectedRow = 0;
  var vPlNamesTableInitComplete = false;

  //-----------------------------------------------------------------------------------------------
  function tracksTab_init(tableHeight=300)
  {
    // console.log("tracksTab_initTracksTab()  plNamesTable ready()");

    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#plNamesTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        //
        // id="tracksTab_btnClearSearchPlNameOnClick"  // did not work
        $(this).html('<button onclick="tracksTab_btnClearSearchPlNameOnClick()" class="btnClrSearch" style="float: left; margin-right: 5px;" title="Clear search">x</button> \
                      <input type="text" style="margin-top: 2px;" name="plNamesTableSearchBox" placeholder="Search"/> ' );
      }
      ftIdx += 1;
    });

    vPlNamesTable = $('#plNamesTable').DataTable(
    {
      fnRowCallback: function(nRow, aData, iDisplayIndex, iDisplayIndexFull)
      {
        // assign unique class name to each row so we can scroll to it in tracksTab_selectRow()
        $(nRow).addClass("c" + aData[0].replace(/\W/g, '') + aData[1].replace(/\W/g, '')); // use playlist Name and Id as class name
      },

      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 18,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false,  // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets: 1, visible: false, searchable: false } ],  // plId is invisible
      select: { style: 'single', toggleable: false },
    });

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    ftIdx = 0;
    $('#tracksTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="tracksTab_btnClearSearchTracksOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'trackTableColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    });

    // console.log("tracksTab_initTracksTab()  tracksTable ready()");
    vPlTracksTable = $('#tracksTable').DataTable(
    {
      // "fnRowCallback": function(nRow, rowData)
      // {
      //     if (rowData[10] != vUserId)  // playlistOwnerId != vUserId
      //       $('td:eq(0)', nRow).addClass('disabledCkBx');
      // },

      initComplete: function()  //col search: https://datatables.net/examples/api/multi_filter.html
      {
        this.api().columns().every(function()
        {
          let that = this;
          $('input', this.footer()).on('keyup change clear', function()
          {
            if (that.search() !== this.value)
            {
              vPlTracksTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      "dom":            "rt",
      "scrollY":         tableHeight - 18,
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false,   // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets: 0, className: 'select-checkbox', orderable: false },
                    { targets: 8, visible: false, searchable: false },     // Playlist Id
                    { targets: 9, visible: false, searchable: false },     // Track Uri
                    { targets: 10, visible: false, searchable: false },    // Playlist Owners Id
                    { targets: 11, visible: false, searchable: false } ],  // Playlist Name
      select: { style: 'multi' }
    } );
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_redraw()
  {
    // console.log('__SF__tracksTab_redraw()');
    vPlNamesTable.columns.adjust().draw();
    vPlTracksTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_scrollToLastSelectedRow()
  {
    let rowData = vPlNamesTable.row(vPlNameTableLastSelectedRow).data();
    let selectRowData = "c" + rowData[0].replace(/\W/g, '') + rowData[1].replace(/\W/g, '') // use playlist Name and Id
    let selection = $('#plNamesTable .' + selectRowData);
    $(".dataTables_scrollBody").scrollTo(selection);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_selectRow()
  {
    // console.log('__SF__tracksTab_selectRow()');
    // issue:
    //  - when clicking on a name row the selection is not remembered when switching back to this tab
    // fix:
    //  - we store the last selected row and apply it when switching this tab
    //  - .select() calls plNameTableSelect() which calls afLoadTracksTableSeq()
    // console.log('__SF__tracksTab_selectRow() - focus - lastSelectedRow = ' + vPlNameTableLastSelectedRow);
    $('#plNamesTable').DataTable().row(vPlNameTableLastSelectedRow).select();

    // issue:
    //  - if you scroll the selected pl name out of view and then go to plTab and back
    //    to the tracksTab the selected pl name is not visible
    // fix:
    //  - use scrollTo util to ensure selected pl name is viewable
    tracksTab_scrollToLastSelectedRow();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__tracksTab_activate()');
      // console.log('__SF__tracksTab_activate() - lastCnt = ' + vLastPlSelectionCntrTracksTab + ', curCnt = ' + curPlSelectionCntr);
      if (vLastPlSelectionCntrTracksTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrTracksTab = curPlSelectionCntr;
        vPlNameTableLastSelectedRow = 0;
        vPlNamesTableInitComplete = false;
        vTracksTabLoading = true;
        $("#tracksTab_plNmTextInput").val('');

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vPlNamesTable.clear().draw();
        vPlTracksTable.clear().draw();
        $('#tracksTab_cbMvCpDest').empty();


        // this will start a chain of async calls
        //   1) loadPlTracks -> loadPlTracks, 2) loadPlNames -> getPlSelectedDict, 3) loadPlTracks -> getTrackList
        // console.log('__SF__tracksTab_afActivate() - start loading');
        tabs_set2Labels('tracksTab_info1', 'Loading...', 'tracksTab_info2', 'Loading...');
        tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...', showStrImmed=true);

        $('#tracksTab_cbMvCpDest').append($('<option>', { value: '0::::str2', text : cbMvDestDefault }));

        tracksTab_setupPlaybackControls();
        await tracksTab_afIncTrackCnt();
        await tracksTab_afLoadPlNameTable();
        await tracksTab_afLoadPlTracks();

        // 2x getTrackList()
        // - on tab switch we call tracksTab_selectRow()
        // - this invokes tracksTab_afLoadTracksTable() via chained events
        //   --> tracksTab_selectRow()
        //     --> tracksTab_plNameTableKeyFocus()
        //       --> tracksTab_plNameTableSelect()
        //         --> tracksTab_afLoadTracksTableSeq(plId, plName)
        //           --> tracksTab_afLoadTracksTable(plId, plName) this is vUrl getTrackList
      }
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afActivate() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
      vPlNamesTableInitComplete = true;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlTracks()
  {
    // console.log('__SF__tracksTab_afLoadPlTracks()');
    let plSelectedDictNotLoaded = await tracksTab_afGetPlSelectedDictNotLoaded();
    // console.log('__SF__tracksTab_afLoadPlTracks() plSelectedDictNotLoaded cnt = ' + Object.keys(plSelectedDictNotLoaded).length);
    // console.log('__SF__tracksTab_loadPlNameTable() - plSelectedDictNotLoaded = \n' + JSON.stringify(plSelectedDictNotLoaded, null, 4));
    // for (let plId in plSelectedDictNotLoaded)
    for (const [plId, value] of Object.entries(plSelectedDictNotLoaded))
      await tracksTab_afLoadPlTracks1x(plId, value['Playlist Name']);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlTracks1x(plId, plName)
  {
    // console.log('__SF__tracksTab_afLoadPlTracks1x()');
    // console.log('tracksTab_afLoadPlTracks1x() - vUrl - loadPlTracks1x plId = ' + plId + ', playlistName = ' + plName);
    // console.log('tracksTab_afLoadPlTracks1x() - vUrl - loadPlTracks1x');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ loadPlTracks1x: 'loadPlTracks1x', plId: plId }), });
    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadPlTracks1x()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadPlTracks1x() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadPlTracks1x()', reply['errRsp'], 'tracksTab_errInfo')

      // no longer used ... we now tell the user it's 25k max...you must selected fewer playlists...
      // vLoadedPlIds = reply['loadedPlIds'];
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlNameTable()
  {
    // console.log('__SF__tracksTab_afLoadPlNameTable()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    let plSelectedDict = await tracksTab_afLoadPlSelectedDict();
    let plDict = await tabs_afGetPlDict();

    // console.log('__SF__tracksTab_loadPlNameTable() - plSelectedDict = \n' + JSON.stringify(plSelectedDict, null, 4));
    $.each(plSelectedDict, function (key, values)
    {
      // col0: plNm (visible),  col1: key/plId (invisble),  col2: # of tracks (visible)
      vPlNamesTable.row.add([values['Playlist Name'], key, plDict[key]['Tracks']]);
    })
    vPlNamesTable.draw();

    if (Object.keys(plSelectedDict).length === 0)
    {
      // console.log('__SF__tracksTab_afLoadPlNameTable() - the returned plSelectedDict is empty');
      return;
    }

    // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + JSON.stringify(plSelectedDict, null, 4));
    $.each(plSelectedDict, function (key, item)
    {
      if (item['Playlist Owners Id'] == vUserId)
      {
        idNm = key + '::::' + item['Playlist Name'];
        // console.log('__SF__tracksTab_afLoadPlNameTable() - userPl = \n' + key + ', ' + item['Playlist Name']);
        plNm = item['Playlist Name'];
        if (plNm.length > 84)
          plNm = plNm.slice(0, 84) + '...';
        $('#tracksTab_cbMvCpDest').append($('<option>', {value: idNm, text: plNm}));
      }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableSelect() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_plNameTableRow_onSelect() - plNamesTable row select indexes = ', indexes);
    if (vTracksTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__tracksTab_plNameTableRow_onSelect() - exiting - loading is true');
      return;
    }
    let rowData = $('#plNamesTable').DataTable().row(indexes).data();
    vPlNameTableLastSelectedRow = indexes[0]
    tracksTab_afLoadTracksTableSeq(rowData[1],rowData[0]);
    // $("#tracksTab_plNmTextInput").val(rowData[0]);
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_plNameTableOrder() { /* make function appear in pycharm structure list */ }
  $('#plNamesTable').on( 'order.dt', function ()
  {
    // console.log('__SF__tracksTab_plNameTableOrder()');

    // order is getting called before the tracks tab is even loaded so we have to do an init check
    if (vPlNamesTableInitComplete === false)
    {
      // console.log('__SF__tracksTab_plNameTableOrder() - exiting - init is not complete');
      return;
    }

    if (vTracksTabLoading === true) // needed when doing a initial load or reload of both tables
    {
      // console.log('__SF__tracksTab_plNameTableOrder() - exiting - loading is true');
      return;
    }

    // order is called on every keystroke when editing the plName search box and .order() returns order[0] that is undefined
    // let order = $('#plNamesTable').DataTable().order();
    // if (order[0] !== undefined && order[0] !== null)
    //   console.log('__SF__tracksTab_plNameTableOrder() - calling scrollTo. user hit sort on col: ' + order[0][0] + ', dir: ' + order[0][1]);

    // use scrollTo to ensure selected pl name is viewable after the user did a sort on the pl name table
    tracksTab_scrollToLastSelectedRow();
  });

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTableSeq(plId, plName)
  {
    try
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() - plId = ' + plId);
      vTracksTabLoading = true;
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...', showStrImmed=false);

      // tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Loading Tracks...');
      await tracksTab_afLoadTracksTable(plId, plName)
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afLoadTracksTableSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadTracksTable(plId = '', plName = '')
  {
    if (plId === '')
    {
      plId = vPlNamesTable.row(0).data()[1];
      plName = vPlNamesTable.row(0).data()[0];
      // console.log('__SF__tracksTab_afLoadTracksTable() - using first row plId = ' + plId);
    }

    infoStr2 = plName;
    tabs_setLabel('tracksTab_info2', infoStr2);


    // vPlTracksTable.clear().draw();// this does not work well here
    // console.log('__SF__tracksTab_afLoadTracksTable() - vUrl - getTrackList, plName = ', plName);
    console.log('__SF__tracksTab_afLoadTracksTable() - vUrl - getTrackList');
    let response = await fetch(vUrl, {  method: 'POST', headers: {'Content-Type': 'application/json',},
                                        body: JSON.stringify({getTrackList: 'getTrackList', plId: plId}),});

    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afLoadTracksTable()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadTracksTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afLoadTracksTable()', reply['errRsp'], 'tracksTab_errInfo')

      let trackList = reply['trackList']
      // console.log('__SF__tracksTab_afLoadTracksTable() - trackList = \n' + JSON.stringify(trackList, null, 4));
      $.each(trackList, function (key, tVals)
      {
        vPlTracksTable.row.add(['', tVals['Track Name'], tVals['Artist Name'], tVals['Album Name'], tVals['Duration Hms'],
                                    tVals['Track Position'], tVals['Playlist Owners Name'], tVals['Track Id'], plId, tVals['Track Uri'],
                                    tVals['Playlist Owners Id'], tVals['Playlist Name']]);
      });
      vPlTracksTable.draw();

      tracksTab_updateSelectedCnt();
      let infoStr2 = 'Playlist is empty';
      if (vPlTracksTable.rows().count() != 0)
        infoStr2 = trackList[0]['Playlist Name'] + ', &nbsp ' + trackList.length + ' songs, &nbsp ' + reply['plDuration']
      tabs_setLabel('tracksTab_info2', infoStr2);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_tracksTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    // console.log('tracksTab_tracksTableRow_onUserSelect() --- user-select.dt');
    // this onUser method is called prior to the checkbox being updated
    // we use it to tell the user they have hit the 100 track selection limit

    let rowAlreadySelected = false;
    let rowNum = cell.index().row;
    vPlTracksTable.rows({selected: true}).every(function (rowIdx, tableLoop, rowLoop)
    {
      if (rowNum === rowIdx)
      {
        rowAlreadySelected = true;
        return false;
      }
    });

    let rowData = vPlTracksTable.row(cell.node()).data()
    if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
    {
      e.preventDefault();
      $("#tracksTab_info3").text("Track can not be removed or moved or copied since it does not have a track id.");
      setTimeout(function ()
      {
        $("#tracksTab_info3").text('');
      }, 4500);
      return;
    }

    if (rowAlreadySelected == false)
    {
      let count = vPlTracksTable.rows({selected: true}).count();
      if (count === vSpotifyRmLimit)
      {
        e.preventDefault();
        // alert('You have hit the track selection limit. The limit is 100 tracks.\n\n' +
        //       'This is a Spotify limit.\n' +
        //       'Spotify limits the number of tracks that can be removed or moved or copied per call to 100.\n\n');
        $("#tracksTab_info3").text(vSpotifyRmLimitMsg);
        setTimeout(function ()
        {
          $("#tracksTab_info3").text('');
        }, 4500);
        return;
      }
    }
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_tracksTableSelect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_tracksTab_tracksTableSelect() - tracksTable row select');
    // this method is called after the checkbox has been selected so we update the selected count
    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function trackTab_tracksTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#tracksTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    // console.log('__SF__tracksTab_tracksTab_tracksTableDeselect() - tracksTable row deselect');
    // this method is called after the checkbox has been deselected so we update the selected count
    tracksTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnRmTracksByPos()
  {
    // console.log('__SF__tracksTab_btnRmTracksByPos()');
    tracksTab_afRmTracksByPosSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afRmTracksByPosSeq()
  {
    try
    {
      // console.log('__SF__tracksTab_afRmTracksByPosSeq()');
      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[10] !== vUserId)
        {
          alert('You can not remove tracks from playlists you do not own.');
          throw "NotOwnerErr";
        }
        rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      // console.log('__SF__tracksTab_afRmTracksByPosSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      vPlNamesTable.clear();
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      await tabs_afRmTracksByPos(rmTrackList);
      await tracksTab_afLoadPlNameTable();
      await tracksTab_afLoadTracksTable(plid=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afRmTracksByPosSeq() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afRmTracksByPosSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
      tracksTab_selectRow()
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClear()
  {
    // console.log('__SF__tracksTab_btnClear()');
    tracksTab_afClearSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afClearSeq()
  {
    // console.log('__SF__tracksTab_afClear()');
    vTracksTabLoading = true;
    tracksTab_btnClearSearchPlNameOnClick(false);
    tracksTab_btnClearSearchTracksOnClick(false);
    vPlNamesTable.order([]);
    vPlTracksTable.order([]);
    vPlNamesTable.clear();  // clear the plNm table
    await tracksTab_afLoadPlNameTable();  // reload plNm table
    vTracksTabLoading = false;
    tracksTab_selectRow();  // this will trigger a track table clear and reload
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearSearchPlNameOnClick(focusOnField=true)
  {
    // console.log('__SF__tracksTab_btnClearSearchPlNameOnClick()');
    let searchInputBox = $('[name="plNamesTableSearchBox"]');
    searchInputBox.val('');
    searchInputBox.keyup();
    if (focusOnField)
    {
      searchInputBox.focus();
      tracksTab_selectRow(); // put focus on last item found
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearSearchTracksOnClick(focusOnField=true)
  {
    // clear search boxes under tracks table
    $("input[name^='trackTableColSearchIB']").each(function() // clear search boxes under tracks table
    {
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    if (focusOnField)
    {
      // last element edited gets focus
      let searchInputBox = $('input[name="'+vPlTracksTableLastSearchCol+'"]');
      searchInputBox.focus();
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_updateSelectedCnt()
  {
    // console.log('__SF__tracksTab_updateSelectedCnt()');
    let count = vPlTracksTable.rows({ selected: true }).count();
    // console.log('__SF__tracksTab_updateSelectedCnt() cnt = ', count);
    tabs_setLabel('tracksTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnHelp()
  {
    vHtmlInfoFn = 'helpTextTabTracks.html';
    $("#btnInfoTab")[0].click();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnMvTracks()
  {
    // console.log('__SF__tracksTab_btnMvTracks()');

    let idNm = $('#tracksTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__tracksTab_cbMvCpDestOnChange() val = ' + idNm[0]);
    // console.log('__SF__tracksTab_cbMvCpDestOnChange() val = ' + idNm[1]);

    let count = vPlTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To move a track(s) you need to select a track(s).');
      return;
    }
    if (count > 100)
    {
      alert('Spotify limits the number of tracks that can be moved at a time to 100. No tracks were moved.\n');
      return;
    }

    if (idNm[0] == '0')
      alert('To move tracks you need to   Select A Destination Playlist    from the drop down combo box.');
    else
      tracksTab_afMvTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afMvTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__tracksTab_afMvTracksSeq()');
      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Moving Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let mvTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[10] !== vUserId)
        {
          alert('You can not move tracks you do not own (try using the copy feature instead).');
          throw "NotOwnerErr";
        }
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          rmTrackList.push({'Playlist Id': rowData[8], 'Track Uri': rowData[9], 'Track Position': parseInt(rowData[5])});
          mvTrackList.push(rowData[9]); // track uri
        }
      });

      if (Object.keys(rmTrackList).length === 0)
        return;

      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(mvTrackList, null, 4));
      // console.log('__SF__tracksTab_afMvTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      vPlNamesTable.clear();//.draw(); draw causes annoying flash
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      await tabs_afMvCpTracks(destPlId, mvTrackList, 'Mv');
      await tabs_afRmTracksByPos(rmTrackList);
      await tracksTab_afLoadPlNameTable()
      await tracksTab_afLoadTracksTable(plid=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() caught error: ', err);
      if (err.toString() == 'NotOwnerErr')
        return;
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
      tracksTab_selectRow()
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnCpTracks()
  {
    // console.log('__SF__tracksTab_btnCpTracks()');

    let idNm = $('#tracksTab_cbMvCpDest option:selected').val();
    idNm = idNm.split('::::', 2)
    // console.log('__SF__tracksTab_btnCpTracks() val = ' + idNm[0]);
    // console.log('__SF__tracksTab_btnCpTracks() val = ' + idNm[1]);

    let count = vPlTracksTable.rows({ selected: true }).count();
    if (count == 0)
    {
      alert('To copy a track(s) you need to select a track(s).');
      return;
    }

    if (idNm[0] == '0')
      alert('To copy tracks you need to   Select A Destination Playlist    from the drop down combo box.');
    else
      tracksTab_afCpTracksSeq(idNm[0], idNm[1]);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afCpTracksSeq(destPlId, destPlName)
  {
    try
    {
      // console.log('__SF__tracksTab_afCpTracksSeq()');
      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Coping Tracks...', showStrImmed=true);

      let cpTrackList = [];
      let rowData;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (rowData[8] != destPlId)  // if src plid == the dest plid skip the track
        {
          cpTrackList.push(rowData[9]); // track uri
        }
      });

      if (Object.keys(cpTrackList).length === 0)
        return;

      // console.log('__SF__tracksTab_afCpTracksSeq() destPlId = \n' + JSON.stringify(destPlId, null, 4));
      // console.log('__SF__tracksTab_afCpTracksSeq() destPlName  = \n' + JSON.stringify(destPlName, null, 4));
      // console.log('__SF__tracksTab_afCpTracksSeq() cpTrackList  = \n' + JSON.stringify(cpTrackList, null, 4));
      await tabs_afMvCpTracks(destPlId, cpTrackList, 'Cp');
      vPlNamesTable.clear();//.draw(); draw causes annoying flash
      vPlTracksTable.clear();//.draw(); draw causes annoying flash
      await tracksTab_afLoadPlNameTable()
      await tracksTab_afLoadTracksTable(plid=rowData[8]);
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_btnCpTracks() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
      tracksTab_selectRow()
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afLoadPlSelectedDict()
  {
    // console.log('__SF__tracksTab_afLoadPlSelectedDict()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    console.log('__SF__tracksTab_afLoadPlSelectedDict() - vUrl - getPlSelectedDict');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getPlSelectedDict: 'getPlSelectedDict'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__tracksTab_afLoadPlSelectedDict()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afLoadPlSelectedDict() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__tracksTab_afLoadPlSelectedDict()', reply['errRsp'], 'tracksTab_errInfo')

      return reply['plSelectedDict']
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afGetPlSelectedDictNotLoaded()
  {
    // console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded()');
    // vPlNamesTable.clear().draw(); // this does not work well here

    console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded() - vUrl - getPlSelectedDictNotLoaded');
    let response = await fetch(vUrl, {method: 'POST', headers: {'Content-Type': 'application/json',},
                                      body: JSON.stringify({getPlSelectedDictNotLoaded: 'getPlSelectedDictNotLoaded'}),});
    if (!response.ok)
      tabs_throwErrHttp('__SF__tracksTab_afGetPlSelectedDictNotLoaded()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afGetPlSelectedDictNotLoaded() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('__SF__tracksTab_afGetPlSelectedDictNotLoaded()', reply['errRsp'], 'tracksTab_errInfo')

      return reply['plSelectedDictNotLoaded']
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afIncTrackCnt()
  {
    // experimental code for a potential play btn feature

    // console.log('__SF__tracksTab_afIncTrackCnt() - vUrl - incTrackCnt');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ incTrackCnt: 'incTrackCnt'}), });
    if (!response.ok)
      tabs_throwErrHttp('tracksTab_afIncTrackCnt()', response.status, 'tracksTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tracksTab_afPlayTracks() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('tracksTab_afIncTrackCnt()', reply['errRsp'], 'tracksTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnSelectAll()
  {
    // console.log('__SF__tracksTab_btnSelectAll()');
    vTracksTabLoading = true;
    let rowData;
    var cntInvalidTrackId = 0;
    vPlTracksTable.rows().every(function ()
    {
      let rowData = this.data();
      // console.log('__SF__tracksTab_btnSelectAll() - track id ' + rowData[7] + ', len = ' + rowData[7].length);
      if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
        cntInvalidTrackId++;
      else
        this.select();
    });
    // console.log('__SF__tracksTab_btnSelectAll() - invalid track id cnt = ' + cntInvalidTrackId);
    vTracksTabLoading = false;
    tracksTab_updateSelectedCnt();
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_setupPlaybackControls()
  {
    // enable/disable the playback btns
    let btn = [$('#tracksTab_PlayTracks'), $('#tracksTab_PauseTrack'), $('#tracksTab_NextTrack'), $('#tracksTab_AddToQueue')];

    btn.forEach((btn) =>
    {
      if (vUserProduct != 'premium')
      {
        btn.css('opacity', '0.2');
        btn.prop("disabled", true);  // disabled on free accounts
      }
      else
      {
        btn.css('opacity', '1.0');
        btn.prop("disabled", false); // enabled on premium accounts
      }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnAddToQueue()
  {
    // btn is disabled if account is not premium
    tracksTab_afAddToQueueSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afAddToQueueSeq()
  {
    try
    {
      // console.log('__SF__tracksTab_afAddToQueueSeq() enter');
      let count = vPlTracksTable.rows({ selected: true }).count();
      if (count == 0)
      {
        alert('Select one or more tracks and then press add to queue.');
        return;
      }

      // start proj bar
      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Adding tracks to queue...', showStrImmed=true);

      let trackUris = [];
      let rowData;
      let cntr = 0;
      $.each(vPlTracksTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        trackUris.push(rowData[9]); // track uri
        // limited to 20 tracks because the spotify api only allows adding one track at a time to the queue
        // if you call this api too fast it will miss tracks so the loader.addToQueue() has a delay between calls to spotify
        cntr++;
        if (cntr === 20)
          return false;
      });

      // console.log('trackuris = ' + trackUris);
      let retVal = await tabs_afAddToQueue(trackUris)
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      console.log('__SF__tracksTab_afAddToQueueSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afAddToQueueSeq() finally');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnPlayTracks()
  {
    // btn is disabled if account is not premium
    tracksTab_afPlayTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afPlayTracksSeq()
  {
    try
    {
      let contextUri = '';
      let trackUris = [];
      let retVal = await tabs_afPlayTracks(contextUri, trackUris) // pressing play on spotify
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      console.log('__SF__tracksTab_afPlayTracksSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnPauseTrack()
  {
    // btn is disabled if account is not premium
    tracksTab_afPauseTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afPauseTrackSeq()
  {
    try
    {
      let retVal = await tabs_afPauseTrack()
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      console.log('__SF__tracksTab_afPauseTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnNextTrack()
  {
    // btn is disabled if account is not premium
    tracksTab_afNextTrackSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afNextTrackSeq()
  {
    try
    {
      let retVal = await tabs_afNextTrack()
      if (retVal == '')
        return;
      alert(retVal)
    }
    catch(err)
    {
      console.log('__SF__tracksTab_afNextTrackSeq() caught error: ', err);
      tabs_errHandler(err);
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnClearPlNmText()
  {
    // console.log('__SF__tracksTab_btnClearPlNmText()');
    $("#tracksTab_plNmTextInput").val('');
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnCreatePlaylist()
  {
    // console.log('__SF__tracksTab_btnCreatePlaylist()');
    tracksTab_afCreatePlaylistSeq();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afCreatePlaylistSeq()
  {
    // console.log('__SF__tracksTab_afCreatePlaylistSeq()');
    try
    {
      if ((vPlTracksTable.rows({selected: true}).count() == 0))
      {
        alert('At least one track must be selected to create a new playlist.');
        return;
      }

      let vNewPlNm = $("#tracksTab_plNmTextInput").val();
      if (vNewPlNm == '')
      {
        alert('Please enter a name for the new playlist.');
        return;
      }

      let plNmAlreadyExists = false;
      let plDict = await tabs_afGetPlDict();
      $.each(plDict, function (key, values)
      {
        if (vNewPlNm.toLowerCase() == values['Playlist Name'].toLowerCase())
          plNmAlreadyExists = true;
      });

      if (plNmAlreadyExists == true)
      {
        alert('Please enter a unique playlist name. You already have or follow a playlist with the currently entered name.');
        return;
      }

      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Creating Playlist...', showStrImmed=true);

      let rowData;
      let createUriTrackList = [];
      $.each(vPlTracksTable.rows('.selected').nodes(), function(i, item)
      {
        rowData = vPlTracksTable.row(this).data();
        if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
          cntInvalidTrackId++;
        else
          createUriTrackList.push(rowData[9]); // track uri
      });
      // console.log('tracksTab_afCreatePlaylistSeq() rmTrackList: rowData = \n' + JSON.stringify(createUriTrackList, null, 4));

      await tabs_afCreatePlaylist(vNewPlNm, createUriTrackList);
      await new Promise(r => setTimeout(r, 3000));  // Spotify can be slow to update the list of playlists

      // reload the plDict so the created pl is in the plDict w/o wiping the already loaded tracks
      await plTab_afLoadPlDict(false);

      // get the plTable to reload when the user goes back to the plTab
      vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

      $("#tracksTab_plNmTextInput").val('');
    }
    catch(err)
    {
      // console.log('__SF__tracksTab_btnCpTracks() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afMvTracksSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  function tracksTab_btnSort()
  {
    // console.log('__SF__tracksTab_btnSort()');
    tracksTab_afSortPlaylist();
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afSortPlaylist()
  {
    //                     { targets: 8, visible: false, searchable: false },      // Playlist Id
    //                     { targets: 9, visible: false, searchable: false },     // Track Uri
    //                     { targets: 10, visible: false, searchable: false },    // Playlist Owners Id
    //                     { targets: 11, visible: false, searchable: false } ],  // Playlist Name

    let nTrks = vPlTracksTable.rows().count();
    if (nTrks === 0)
    {
      alert('The playlist you selected does not have any tracks.');
      return;
    }

    // get the data on the selected playlist
    let rowDataTrack0 = vPlTracksTable.row(0).data();
    let plId = rowDataTrack0[8];
    let ownerId = rowDataTrack0[10];
    let plNm = rowDataTrack0[11];
    // console.log('trks: ' + nTrks + ', plId: ' + plId + ', ownerId: ' + ownerId + ', plNm: ' + plNm);
    
    //---- check if user owns playlist
    if (ownerId !== vUserId)
    {
      alert('You can not sort a playlist you do not own.');
      return;
    }

    if (vPlTracksTable.rows().count() > 3000)
    {
      alert('Sorting is only allowed on playlists with less than 3000 tracks.');
      return;
    }

    msg = 'Please confirm that you would like to Sort this playlist: \n' +
           '   ' + plNm + '\n\n' +
          'Note 1: A backup of this playlist is made prior to applying the Sort.\n' +
          'Note 2: Once the Sort completes, and you are satisfied with the results, you can delete the backup.\n';

    if (confirm(msg) == false)
      return;

    await tracksTab_afSortPlaylistSeq(plNm, plId);
  }

  //-----------------------------------------------------------------------------------------------
  async function tracksTab_afSortPlaylistSeq(plNm, plId)
  {
    try
    {
      vTracksTabLoading = true;
      tabs_progBarStart('tracksTab_progBar', 'tracksTab_progStat1', 'Applying Sort to Playlist...', showStrImmed=true);

      let rowData;
      let uriTrackListSorted = [];
      let cntInvalidTrackId = 0;

      vPlTracksTable.rows().every(function ()
      {
        let rowData = this.data();
        if (!rowData[7])    // !trackId tests for "", null, undefined, false, 0, NaN
          cntInvalidTrackId++;
        else
          uriTrackListSorted.push(rowData[9]); // track uri
      });

      // console.log("__SF__tracksTab_afSortPlaylistSeq() invalid track id cnt: " + cntInvalidTrackId);

      vPlTracksTable.clear();
      let reply = await tabs_afSortPlaylist(plNm, plId, uriTrackListSorted, true);
      // console.log('reply = ', reply['errRsp']);
      buPlNm = reply['buPlNm'];

      // did we have a refresh error
      if (reply['errRsp'][0] != 1)
      {
        if (reply['errRsp'][0] === -48) // errSortPlaylistBu
        {
          msg = 'Sort Failed\n' +
                'Failed to create a playlist backup.\n' +
                'The original playlist was not modified.\n\n' +
                'A session restart is needed.\n' +
                'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
          return;
        }

        if (reply['errRsp'][0] === -49) // errSortPlaylistWr
        {
          msg = '*** READ THIS MESSAGE CAREFULLY ***\n' +
              'Sort Playlist Failed\n' +
              'Unable to copy tracks from backup to original playlist.\n'+
              'A backup playlist was successfully created:\n'+
              '   ' + buPlNm + '\n' +
              'You may need to recover from this error by using the Spotify App to copy the tracks from the backup playlist to the original playlist.\n\n' +
              'A session restart is needed.\n' +
              'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
          return;
        }

        if (reply['errRsp'][0] === -50) // errSortPlaylistReLd
        {
          // reloading the playlist threw an error after the sort write finished ok
          msg = 'Sort Finished Successfully\n\n' +
                'A backup playlist was created:\n'+
                '   ' + buPlNm + '\n' +
                'Once you are satified with the results, you can delete the backup.\n' +
                'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
          return;
        }

        if (reply['errRsp'][0] === -47) // errSortPlaylist
        {
          msg = 'Sort Failed\n\n' +
                'A session restart is needed.\n' +
                'Press Ok and you will be redirected to the home page.\n';
          alert(msg);
          let urlSpotifyFinderStartPage = window.location.origin;
          location.replace(urlSpotifyFinderStartPage); // goto home page
          return;
        }
      }

      await new Promise(r => setTimeout(r, 3000));  // Spotify can be slow to update the list of playlists
      await tracksTab_afLoadTracksTable(plId);

      msg = 'Sort Finished Successfully\n\n' +
            'A backup playlist was created:\n'+
            '   ' + buPlNm + '\n' +
            'Once you are satified with the results, you can delete the backup.\n';
      alert(msg);

      // get the plTable to reload when the user goes back to the plTab
      vCurTracksRmMvCpCntr = vCurTracksRmMvCpCntr + 1;

      // reload the plDict so the sort backup is in the plDict w/o wiping the already loaded tracks
      await plTab_afLoadPlDict(false);
    }
    catch(err)
    {
      console.log('__SF__tracksTab_afSortPlaylistSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__tracksTab_afSortPlaylistSeq() finally.');
      tabs_progBarStop('tracksTab_progBar', 'tracksTab_progStat1', '');
      vTracksTabLoading = false;
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function tabs_afSortPlaylist(plNm, plId, uriTrackListSorted, reload)
  {
    console.log('__SF__tabs_afSortPlaylist() - vUrl - CreatePlaylist');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ sortPlaylist: 'sortPlaylist',
                                                                    plNm: plNm,
                                                                    plId: plId,
                                                                    reload: reload,
                                                                    uriTrackListSorted: uriTrackListSorted
                                                                  })});
    if (!response.ok)
      tabs_throwErrHttp('tabs_afSortPlaylist()', response.status, 'tabs_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__tabs_afSortPlaylist() reply = ', reply);
      return reply
    }
  }

