  var vSearchTable;
  var vLastPlSelectionCntrSearchTab = 0;
  var vSearchTableLastSearchCol = '';
  var vSearchTabLoading = false;

  var vModePlaylist = 'Same'  // 'Across' or 'Same'
  var vModeSearch = 'Track Id'  // 'Track Id' or 'Nad' = TrackName/ArtistName/Duration

  //-----------------------------------------------------------------------------------------------
  function searchTab_init(tableHeight=300)
  {
    // console.log("searchTab_initPlTab() - searchTable ready()");
    
    // after a refresh put the radio btns back into the initial state (needed for firefox)
    $(rPlModeAcross).prop('checked',true);
    $(rPlSearchId).prop('checked',true);

    // must be before table creation
    // add search input boxes to the dom at the bottom of the desired columns
    let ftIdx = 0;
    $('#searchTable tfoot th').each(function()
    {
      if (ftIdx === 0)
      {
        $(this).html('<button onclick="searchTab_btnClearSearchPlOnClick()" class="btnClrSearch" title="Clear search">x</button>');
      }
      if (ftIdx !== 0)
      {
        let ibName = 'searchColSearchIB' + ftIdx;
        $(this).html('<input type="text" name="' + ibName + '" placeholder="Search"/>');
      }
      ftIdx += 1;
    } );

    vSearchTable = $('#searchTable').DataTable(
    {
      "fnRowCallback": function(nRow, rowData)
      {
          if (rowData[11] != vUserId)   // playlistOwnerId != vUserId
            $('td:eq(0)', nRow).addClass('disabledCkBx');
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
              vSearchTableLastSearchCol = this.name;
              that.search(this.value)
              that.draw();
            }
          });
        });
      },

      // dom default: lfrtip; ('r', 't' provides processing, table) (no 'f, 'p', 'i' removes search btn, paging info)
      "dom":            "rt",
      "scrollY":         tableHeight - 65,  // compensate for extra height for radio btns that the other tabs do not have
      "scrollCollapse":  false,
      "paging":          false,
      "orderClasses":    false, // background color of sorted column does not change
      "order":           [],
      columnDefs: [ { targets:  0, className: 'select-checkbox', orderable: false },
                    { targets:  9, visible: false, searchable: false },
                    { targets: 10, visible: false, searchable: false },
                    { targets: 11, visible: false, searchable: false }],
      select: { style: 'multi' }
    });
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_redraw()
  {
    // console.log('__SF__searchTab_redraw()');
    vSearchTable.columns.adjust().draw();
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afActivate(curPlSelectionCntr)
  {
    try
    {
      // console.log('__SF__searchTab_activate()');
      // console.log('__SF__searchTab_activate() - lastCnt = ' + vLastPlSelectionCntrSearchTab + ', curCnt = ' + curPlSelectionCntr);

      // if you click "Playlists selected on this tab determines..." at the bottom of the plTab load times for each tab will be displayed (for dbg)
      let t0;
      if (vShowExeTm == 1)
      {
        $("#searchTab_ExeTm").text(0);
        t0 = Date.now();
      }

      if (vLastPlSelectionCntrSearchTab !== curPlSelectionCntr)
      {
        vLastPlSelectionCntrSearchTab = curPlSelectionCntr;
        vSearchTabLoading = true;

        // this works better if the clear tables are here instead of being inside async calls
        // we are reloading both tables so we empty them out
        vSearchTable.clear().draw();

        // console.log('__SF__searchTab_afActivate() - start loading');
        $("#searchTab_info3").text('');
        tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
        tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Loading...', showStrImmed=true);

        await tracksTab_afLoadPlTracks();

        if (vShowExeTm == 1)
        {
          exeTm = Math.floor((Date.now() - t0) / 1000);
          $("#searchTab_ExeTm").text(exeTm);
        }
        // console.log('__SF__searchTab_afActivate() - loading done - exit');
      }
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afActivate() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTableSeq()
  {
    try
    {
      // console.log("searchTab_afLoadSearchTableSeq()");
      vSearchTabLoading = true;
      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Finding Duplicates...', showStrImmed=true);

      vSearchTable.order([]); // remove sorting
      vSearchTable.clear().draw();
      await searchTab_afLoadSearchTable();
    }
    catch(err)
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afLoadSearchTableSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_radioBtnEventMode() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlMode]').change(function()
  {
    searchTab_afSearchSeq();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_radioBtnEventSearch() { /* make function appear in pycharm structure list */ }
  $('input[type=radio][name=rPlSearch]').change(function()
  {
    searchTab_afSearchSeq()
  });

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afSearchSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afSearchSeq()');
      vSearchTabLoading = true;
      vSearchTable.clear().draw();

      // console.log('__SF__searchTab_afSearchSeq() - start loading');
      $("#searchTab_info3").text('');
      tabs_set2Labels('searchTab_info1', 'Loading...', 'searchTab_info2', 'Loading...');
      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Searching...', showStrImmed=true);

      await searchTab_afNameSearch();
      await searchTab_afLoadSearchTable();

      // console.log('__SF__searchTab_afSearchSeq() - loading done - exit');
    }
    catch(err)
    {
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afSearchSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afNameSearch()
  {
    // var vModePlaylist = 'Across'  // or 'Same'
    // var vModeSearch = 'Track Id'  // or 'Nad' = TrackName/ArtistName/Duration

    // console.log('__SF__searchTab_afNameSearch()');

    vModePlaylist = $("input[name='rPlMode']:checked").val();
    vModeSearch = $("input[name='rPlSearch']:checked").val();
    // console.log('__SF__searchTab_afNameSearch() - radio btn values vModePlaylist = ' + vModePlaylist + ', vModeSearch = ' + vModeSearch)

    console.log('__SF__searchTab_afNameSearch() - vUrl - runSearch');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ runSearch: 'runSearch', modePlaylist: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afNameSearch()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afNameSearch()', reply['errRsp'], 'searchTab_errInfo')
    }
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afLoadSearchTable()
  {
    // console.log('__SF__searchTab_afLoadSearchTable()');
    console.log('__SF__searchTab_afLoadSearchTable() - vUrl - getSearchTrackList');
    let response = await fetch(vUrl, { method: 'POST', headers: {'Content-Type': 'application/json',},
                                       body: JSON.stringify({ getSearchTrackList: 'getSearchTrackList', modePlayList: vModePlaylist, modeSearch: vModeSearch }), });
    if (!response.ok)
      tabs_throwErrHttp('searchTab_afLoadSearchTable()', response.status, 'searchTab_errInfo');
    else
    {
      let reply = await response.json();
      // console.log('__SF__searchTab_afLoadPlTable() reply = ', reply);
      if (reply['errRsp'][0] !== 1)
        tabs_throwSvrErr('searchTab_afLoadSearchTable()', reply['errRsp'], 'searchTab_errInfo');

      let searchTrackList = reply['searchTrackList'];
      $.each(searchTrackList, function(key, tvals)
      {
        vSearchTable.row.add(['', tvals['Track Name'], tvals['Artist Name'], tvals['Album Name'], tvals['Playlist Name'],
                                  tvals['Duration Hms'], tvals['Track Position'], tvals['Playlist Owners Name'], tvals['Track Id'],
                                  tvals['Playlist Id'], tvals['Track Uri'], tvals['Playlist Owners Id'] ]);
      });
      vSearchTable.draw();

      searchTab_updateSelectedCnt();
      let infoStr2 = 'Matches in Selected Playlists: ' + reply['numSearchMatches'];
      tabs_setLabel('searchTab_info2', infoStr2);

      if (reply['numSearchMatches'] == 0)
      {
        msg = 'No matches found in selected playlists.';
        $("#searchTab_info3").text(msg);
      }
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableRow_onUserSelect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on('user-select.dt', function (e, dt, type, cell, originalEvent)
  {
    rowData = vSearchTable.row(cell.node()).data()
    // let rowData = vPlTracksTable.row(indexes).data();
    // console.log('__SF__searchTab_searchTableRow_onUserSelect(): rowData = \n' + JSON.stringify(rowData, null, 4));
    if (rowData[12] != vUserId)    // playlistOwnerId != vUserId
    {
       e.preventDefault();
       $("#searchTab_info3").text("Track can not be selected/removed since you are not the playlist owner.");
       setTimeout(function() { $("#searchTab_info3").text(''); }, 4500);
       return;
    }

    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableSelect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'select.dt', function ( e, dt, type, indexes )
  {
    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_searchTableDeselect() { /* make function appear in pycharm structure list */ }
  $('#searchTable').on( 'deselect.dt', function ( e, dt, type, indexes )
  {
    searchTab_updateSelectedCnt();
  });

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnClearSearchPlOnClick()
  {
    //console.log('__SF__searchTab_btnClearSearchPlOnClick()');
    // clear search boxes under pl table
    $("input[name^='searchColSearchIB']").each(function()
    {
      // for unknown reasons there are 12 instead of 6 input search boxes. clear them all...ugh
      $(this).val('');   // this = dom element  // $(this) = dom element in a jquery wrapper so val() is available
      $(this).keyup();
    });

    // last element edited gets focus
    let searchInputBox = $('input[name="'+vSearchTableLastSearchCol+'"]');
    searchInputBox.focus();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_updateSelectedCnt()
  {
    //console.log('__SF__artistsTab_updateSelectedCnt()');
    let count = vSearchTable.rows({ selected: true }).count();
    tabs_setLabel('searchTab_info1', 'Selected Tracks: ' + count);
  }

  //-----------------------------------------------------------------------------------------------
  async function searchTab_afRmTracksSeq()
  {
    try
    {
      // console.log('__SF__searchTab_afRmTracksSeq()');
      vSearchTabLoading = true;

      tabs_progBarStart('searchTab_progBar', 'searchTab_progStat1', 'Removing Tracks...', showStrImmed=true);

      let rmTrackList = [];
      let rowData;
      $.each(vSearchTable.rows('.selected').nodes(), function (i, item)
      {
        rowData = vSearchTable.row(this).data();
        rmTrackList.push({'Playlist Id': rowData[9], 'Track Uri': rowData[10], 'Track Position': parseInt(rowData[3])});
      });

      if (Object.keys(rmTrackList).length < 0)
        return

      vSearchTable.clear();//.draw(); draw causes annoying flash
      // console.log('__SF__searchTab_afRmTracksSeq() rmTrackList: rowData = \n' + JSON.stringify(rmTrackList, null, 4));
      await tabs_afRemoveTracks(rmTrackList);
      vSearchTable.clear();
      await searchTab_afNameSearch();
      await searchTab_afLoadSearchTable();
    }
    catch(err)
    {
      // console.log('__SF__plTab_afActivate() caught error: ', err);
      tabs_errHandler(err);
    }
    finally
    {
      // console.log('__SF__searchTab_afRmTracksSeq() finally.');
      vSearchTabLoading = false;
      tabs_progBarStop('searchTab_progBar', 'searchTab_progStat1', '');
    }
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnRemoveTracks()
  {
    // console.log('__SF__searchTab_btnRemoveTracks()');
    searchTab_afRmTracksSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnRefresh()
  {
    // console.log('__SF__searchTab_btnRefresh()');
    searchTab_btnClearSearchPlOnClick();
    searchTab_afLoadSearchTableSeq();
  }

  //-----------------------------------------------------------------------------------------------
  function searchTab_btnHelp()
  {
    // console.log('__SF__searchTab_btnHelp()');
    vHtmlInfoFn = 'helpTextTabSearch.html';
    $("#btnInfoTab")[0].click();
  }
